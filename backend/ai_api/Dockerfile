# ============================================
# AI API Dockerfile (GPU Enabled)
# PyTorch + CUDA + BuildKit caching
# ============================================

FROM pytorch/pytorch:2.2.2-cuda12.1-cudnn8-runtime

WORKDIR /app

# ---------- System Dependencies ----------
# Including OpenCV requirements and compilation tools for insightface/pgvector

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

# ---------- Install Node (needed for email/notification scripts etc.) ----------

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# ---------- Node Dependencies (cached layer) ----------
# We need to copy the root package.json for node extensions

COPY package*.json ./
RUN npm install --production || true \
    && npm install nodemailer

# ---------- Python Dependencies (cached layer) ----------
# Copy the AI API specific requirements

COPY ai_api/requirements.txt requirements.txt

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ---------- Copy Backend Source ----------
# Copy the entire backend source as there are shared commons and db folders

COPY . .

# ---------- Runtime Directories ----------

RUN mkdir -p \
    /app/uploads \
    /app/downloads \
    /app/banners \
    /app/embeddings

EXPOSE 5001

CMD ["python", "-m", "uvicorn", "ai_api.main:app", "--host", "0.0.0.0", "--port", "5001"]
