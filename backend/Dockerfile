# ============================================
# Backend Dockerfile (GPU Enabled)
# PyTorch + CUDA + BuildKit caching
# ============================================

# ---- PyTorch with CUDA runtime ----
FROM pytorch/pytorch:2.2.2-cuda12.1-cudnn8-runtime

WORKDIR /app

# ---------- System Dependencies ----------

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libpq-dev \
    curl \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# ---------- Install Node (needed for zip / utilities etc) ----------

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# ---------- Python Dependencies (cached layer) ----------

COPY requirements.txt .

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ---------- Node Dependencies (cached layer) ----------

COPY package*.json ./
RUN npm install --production || true

# ---------- Copy Backend Source ----------

COPY . .

# ---------- Runtime Directories ----------

RUN mkdir -p \
    /app/uploads \
    /app/downloads \
    /app/banners \
    /app/embeddings

# ---------- Ports ----------

EXPOSE 3001 5001

# ---------- Default Start (General API) ----------

CMD ["python", "-m", "uvicorn", "general_api.main:app", "--host", "0.0.0.0", "--port", "3001"]