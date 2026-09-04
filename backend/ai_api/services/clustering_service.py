import logging
import numpy as np
import random
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

logger = logging.getLogger("clustering_service")


@dataclass
class ClusteringConfigV2:
    # KNN graph edge threshold — main gate for "same person"
    edge_similarity_threshold: float = 0.35   # very permissive: allows wide angle/lighting variation

    # Post-CW merge: centroids above this → merge clusters
    merge_similarity_threshold: float = 0.35  # aggressive merging for same-person cluster fragments

    # DBSCAN pre-clustering params
    dbscan_eps: float = 0.85                  # cosine distance: 0.85 = very permissive initial grouping
    dbscan_min_samples: int = 1               # min_samples=1 means no noise points — every face joins a cluster

    # Chinese Whispers
    knn_k: int = 30
    cw_iterations: int = 30
    seed: int = 42

    # Singletons: faces with no DBSCAN neighbor still get their own cluster (not discarded)
    keep_singletons: bool = False

    # Noise assignment threshold used after DBSCAN for unclustered faces.
    noise_assignment_threshold: float = 0.55

    # Minimum cluster size to show in UI (singletons with 1 photo can be hidden)
    min_cluster_size_for_display: int = 1


class ClusteringServiceV2:

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    @staticmethod
    def cluster_embeddings(
        embeddings: np.ndarray,
        config: ClusteringConfigV2,
    ) -> Tuple[np.ndarray, Dict[int, np.ndarray]]:
        """
        Cluster N face embeddings into identity groups.


        Returns:
            labels    — int array shape (N,), label per embedding
            centroids — dict {label: centroid_embedding}
        """
        n = len(embeddings)
        if n == 0:
            return np.array([], dtype=np.int32), {}
        if n == 1:
            emb = ClusteringServiceV2._normalize(embeddings[0:1])
            return np.array([0], dtype=np.int32), {0: emb[0]}

        normalized = ClusteringServiceV2._normalize(embeddings.astype(np.float32))
        has_seeds = False
        seed_labels = None

        # Step 1: DBSCAN to find core clusters and noise
        dbscan_labels = ClusteringServiceV2._dbscan_cosine(
            normalized,
            eps=config.dbscan_eps,
            min_samples=config.dbscan_min_samples,
        )
        n_dbscan_clusters = int(dbscan_labels.max()) + 1 if dbscan_labels.max() >= 0 else 0
        n_noise = int(np.sum(dbscan_labels == -1))
        logger.info(f"DBSCAN: {n_dbscan_clusters} clusters, {n_noise} noise points from {n} embeddings")

        # Step 1.5: reserved no-op block after removing reference seeding
        if has_seeds and seed_labels is not None:
            # Reserve label space: reference labels first (0..R-1),
            # then DBSCAN labels get offset by R
            ref_label_max = int(seed_labels.max()) + 1
            # Offset DBSCAN labels so they don't collide with ref labels
            for i in range(n):
                if seed_labels[i] >= 0:
                    # This face matches a reference person → use ref label
                    dbscan_labels[i] = int(seed_labels[i])
                elif dbscan_labels[i] >= 0:
                    # Shift DBSCAN label to avoid collision
                    dbscan_labels[i] = dbscan_labels[i] + ref_label_max

        # Step 2: Use DBSCAN labels directly (CW removed — it over-fragments)
        confirmed_mask = dbscan_labels >= 0
        confirmed_indices = np.where(confirmed_mask)[0]
        noise_indices = np.where(~confirmed_mask)[0]

        labels = np.full(n, -1, dtype=np.int32)
        label_offset = 0

        if len(confirmed_indices) > 0:
            for i, orig_idx in enumerate(confirmed_indices):
                labels[orig_idx] = int(dbscan_labels[orig_idx])
            label_offset = int(dbscan_labels.max()) + 1

        # Step 3: Merge oversplit clusters (iterative, no size guard)
        if len(confirmed_indices) > 0:
            confirmed_labels = labels[confirmed_indices]
            merged_labels = ClusteringServiceV2._merge_oversplit(
                normalized[confirmed_indices],
                confirmed_labels,
                threshold=config.merge_similarity_threshold,
            )
            for i, orig_idx in enumerate(confirmed_indices):
                labels[orig_idx] = int(merged_labels[i])
            label_offset = int(merged_labels.max()) + 1 if len(merged_labels) > 0 else 0

        # Step 4: Assign noise points to nearest existing cluster, or make singletons
        if len(noise_indices) > 0 and len(confirmed_indices) > 0:
            # Compute centroids of current clusters to match noise against
            current_centroids = ClusteringServiceV2._compute_centroids(normalized, labels)
            if current_centroids:
                centroid_labels = list(current_centroids.keys())
                centroid_matrix = np.array([current_centroids[l] for l in centroid_labels], dtype=np.float32)
                noise_embs = normalized[noise_indices]
                # Similarity of each noise point to each cluster centroid
                sim_to_clusters = np.dot(noise_embs, centroid_matrix.T)

                assigned = 0
                for i, orig_idx in enumerate(noise_indices):
                    best_cluster_idx = int(np.argmax(sim_to_clusters[i]))
                    best_sim = float(sim_to_clusters[i, best_cluster_idx])
                    if best_sim >= config.noise_assignment_threshold:
                        labels[orig_idx] = centroid_labels[best_cluster_idx]
                        assigned += 1
                    elif config.keep_singletons:
                        labels[orig_idx] = label_offset
                        label_offset += 1
                logger.info(f"Noise assignment: {assigned}/{len(noise_indices)} assigned to existing clusters, "
                            f"{len(noise_indices) - assigned} remain as singletons")
            else:
                # No clusters exist, make singletons
                if config.keep_singletons:
                    for i, orig_idx in enumerate(noise_indices):
                        labels[orig_idx] = label_offset + i
        elif len(noise_indices) > 0 and config.keep_singletons:
            for i, orig_idx in enumerate(noise_indices):
                labels[orig_idx] = label_offset + i

        # Remap to contiguous 0..K-1
        valid_mask = labels >= 0
        if valid_mask.any():
            unique_labels = np.unique(labels[valid_mask])
            remap = {old: new for new, old in enumerate(unique_labels)}
            for idx in np.where(valid_mask)[0]:
                labels[idx] = remap[int(labels[idx])]

        centroids = ClusteringServiceV2._compute_centroids(normalized, labels)
        logger.info(f"Final clusters: {len(centroids)} identities from {n} faces")
        return labels, centroids

    # ------------------------------------------------------------------
    # DBSCAN (cosine distance, pure numpy — no sklearn needed)
    # ------------------------------------------------------------------

    @staticmethod
    def _dbscan_cosine(
        normalized: np.ndarray,
        eps: float,
        min_samples: int,
    ) -> np.ndarray:
        """
        Simplified DBSCAN using cosine distance matrix.
        eps is a cosine DISTANCE (= 1 - similarity).
        Returns label array: -1 = noise, 0..K-1 = cluster id.
        """
        n = len(normalized)
        sim_matrix = np.dot(normalized, normalized.T)
        np.fill_diagonal(sim_matrix, 1.0)
        # Cosine distance
        dist_matrix = 1.0 - sim_matrix

        labels = np.full(n, -1, dtype=np.int32)
        cluster_id = 0

        def region_query(idx):
            return np.where(dist_matrix[idx] <= eps)[0].tolist()

        visited = np.zeros(n, dtype=bool)

        for i in range(n):
            if visited[i]:
                continue
            visited[i] = True
            neighbors = region_query(i)
            if len(neighbors) < min_samples:
                labels[i] = -1  # noise for now
                continue
            labels[i] = cluster_id
            seed_set = set(neighbors) - {i}
            while seed_set:
                j = seed_set.pop()
                if not visited[j]:
                    visited[j] = True
                    j_neighbors = region_query(j)
                    if len(j_neighbors) >= min_samples:
                        seed_set.update(set(j_neighbors) - {j})
                if labels[j] == -1:
                    labels[j] = cluster_id
            cluster_id += 1

        return labels

    # ------------------------------------------------------------------
    # KNN graph
    # ------------------------------------------------------------------

    @staticmethod
    def _build_knn_graph(
        normalized: np.ndarray,
        k: int,
        threshold: float,
    ) -> List[List[Tuple[int, float]]]:
        n = len(normalized)
        neighbors: List[List[Tuple[int, float]]] = [[] for _ in range(n)]
        if n <= 1:
            return neighbors

        effective_k = min(k, n - 1)
        sim = np.dot(normalized, normalized.T)
        np.fill_diagonal(sim, -1.0)

        for i in range(n):
            top_k = np.argpartition(-sim[i], effective_k - 1)[:effective_k]
            for j in top_k:
                s = float(sim[i, j])
                if s >= threshold:
                    neighbors[i].append((int(j), s))

        isolated = sum(1 for nb in neighbors if len(nb) == 0)
        avg_nb = np.mean([len(nb) for nb in neighbors])
        logger.info(f"KNN graph: {n} nodes, avg_neighbors={avg_nb:.1f}, isolated={isolated}")
        return neighbors

    # ------------------------------------------------------------------
    # Chinese Whispers
    # ------------------------------------------------------------------

    @staticmethod
    def _chinese_whispers(
        neighbors: List[List[Tuple[int, float]]],
        iterations: int,
        seed: int,
    ) -> np.ndarray:
        n = len(neighbors)
        if n == 0:
            return np.array([], dtype=np.int32)
        labels = np.arange(n, dtype=np.int32)
        rng = random.Random(seed)

        for iteration in range(1, iterations + 1):
            order = list(range(n))
            rng.shuffle(order)
            changes = 0
            for node in order:
                if not neighbors[node]:
                    continue
                weights: Dict[int, float] = {}
                for nb, w in neighbors[node]:
                    lbl = int(labels[nb])
                    weights[lbl] = weights.get(lbl, 0.0) + w
                if not weights:
                    continue
                best_w = max(weights.values())
                best_lbl = rng.choice([l for l, w in weights.items() if abs(w - best_w) < 1e-9])
                if labels[node] != best_lbl:
                    labels[node] = best_lbl
                    changes += 1
            change_rate = changes / max(n, 1)
            logger.debug(f"CW iter {iteration}: changes={changes} ({change_rate:.3f}), clusters={len(np.unique(labels))}")
            if changes == 0 or change_rate < 0.003:
                logger.info(f"CW converged at iteration {iteration}")
                break

        unique = np.unique(labels)
        remap = {old: new for new, old in enumerate(unique)}
        return np.array([remap[int(l)] for l in labels], dtype=np.int32)

    # ------------------------------------------------------------------
    # Post-CW merge (no size guard — this is the critical bug 4 fix)
    # ------------------------------------------------------------------

    @staticmethod
    def _merge_oversplit(
        normalized: np.ndarray,
        labels: np.ndarray,
        threshold: float,
    ) -> np.ndarray:
        """
        Iteratively merge clusters whose centroids score >= threshold.
        Runs multiple rounds: after each merge, centroids are recomputed,
        enabling transitive merges (A->B->C) that wouldn't happen in one pass.
        No min_cluster_size guard — that guard was bug 4.
        """
        merged = labels.copy()
        total_merges = 0
        max_rounds = 10

        for round_num in range(1, max_rounds + 1):
            unique = np.unique(merged)
            centroids = ClusteringServiceV2._compute_centroids(normalized, merged)
            parent = {int(l): int(l) for l in unique}

            def find(x):
                while parent[x] != x:
                    parent[x] = parent[parent[x]]
                    x = parent[x]
                return x

            label_list = [int(l) for l in unique]
            round_merges = 0
            for i, li in enumerate(label_list):
                for lj in label_list[i + 1:]:
                    sim = float(np.dot(centroids[li], centroids[lj]))
                    if sim >= threshold:
                        ra, rb = find(li), find(lj)
                        if ra != rb:
                            parent[rb] = ra
                            round_merges += 1

            if round_merges == 0:
                break

            total_merges += round_merges
            for l in label_list:
                merged[merged == l] = find(l)

            # Remap to contiguous
            u2 = np.unique(merged)
            remap = {old: new for new, old in enumerate(u2)}
            merged = np.array([remap[int(l)] for l in merged], dtype=np.int32)

            logger.info(f"merge_oversplit round {round_num}: merged {round_merges} pairs, "
                        f"{len(u2)} clusters remain")

        if total_merges:
            logger.info(f"merge_oversplit total: {total_merges} merges across rounds at threshold={threshold:.2f}")

        return merged

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _normalize(embs: np.ndarray) -> np.ndarray:
        norms = np.linalg.norm(embs, axis=1, keepdims=True)
        return embs / (norms + 1e-10)

    @staticmethod
    def _compute_centroids(normalized: np.ndarray, labels: np.ndarray) -> Dict[int, np.ndarray]:
        centroids = {}
        for label in np.unique(labels):
            if label < 0:
                continue
            cluster_embs = normalized[labels == label]
            c = np.mean(cluster_embs, axis=0)
            centroids[int(label)] = c / (np.linalg.norm(c) + 1e-10)
        return centroids

    @staticmethod
    def compute_confidence(embedding: np.ndarray, centroid: np.ndarray) -> float:
        """
        Confidence score = cosine similarity * 100.
        This fixes the 'always 0%' bug — the original code never computed this.
        """
        emb = embedding / (np.linalg.norm(embedding) + 1e-10)
        cen = centroid / (np.linalg.norm(centroid) + 1e-10)
        return float(np.clip(np.dot(emb, cen), 0.0, 1.0)) * 100.0


# Singleton
clustering_service = ClusteringServiceV2()
