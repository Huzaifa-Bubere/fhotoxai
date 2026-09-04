import numpy as np
import random
import logging
from typing import List, Dict, Optional

logger = logging.getLogger("clustering_service")

class ClusteringService:
    @staticmethod
    def chinese_whispers(similarity_matrix, threshold=0.55, iterations=30):
        n = len(similarity_matrix)
        if n == 0: return np.array([])
        if n == 1: return np.array([0])
            
        labels = np.arange(n)
        rows, cols = np.where(similarity_matrix > threshold)
        mask = rows != cols
        rows, cols = rows[mask], cols[mask]
        
        neighbors = [[] for _ in range(n)]
        for i, j in zip(rows, cols):
            neighbors[i].append((j, similarity_matrix[i, j]))
        
        for iteration in range(iterations):
            order = np.random.permutation(n)
            changes = 0
            for node in order:
                if not neighbors[node]: continue
                label_weights = {}
                for neighbor, weight in neighbors[node]:
                    lbl = labels[neighbor]
                    label_weights[lbl] = label_weights.get(lbl, 0) + weight
                
                if not label_weights: continue
                max_w = max(label_weights.values())
                best_labels = [lbl for lbl, w in label_weights.items() if abs(w - max_w) < 1e-9]
                best_label = random.choice(best_labels)
                
                if labels[node] != best_label:
                    labels[node] = best_label
                    changes += 1
            if changes == 0: break
                
        unique = np.unique(labels)
        remap = {old: new for new, old in enumerate(unique)}
        return np.array([remap[l] for l in labels])

    @staticmethod
    def merge_oversplit(embeddings, labels, similarity_matrix, threshold=0.82):
        unique_labels = np.unique(labels)
        centroids = {}
        for label in unique_labels:
            mask = labels == label
            c_embeddings = embeddings[mask]
            centroid = np.mean(c_embeddings, axis=0)
            centroids[label] = centroid / np.linalg.norm(centroid)
        
        new_labels = labels.copy()
        merged_map = {l: l for l in unique_labels}
        
        for i, l_i in enumerate(unique_labels):
            for j in range(i + 1, len(unique_labels)):
                l_j = unique_labels[j]
                sim = np.dot(centroids[l_i], centroids[l_j])
                if sim > threshold:
                    # Conservative merge logic simplified
                    root_i = merged_map[l_i]
                    while merged_map[root_i] != root_i: root_i = merged_map[root_i]
                    merged_map[l_j] = root_i
        
        for old_l, new_l in merged_map.items():
            new_labels[labels == old_l] = new_l
            
        # Re-index
        u = np.unique(new_labels)
        r = {old: n for n, old in enumerate(u)}
        return np.array([r[l] for l in new_labels])

# Singleton instance
clustering_service = ClusteringService()
