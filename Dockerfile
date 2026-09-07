FROM python:3.10-slim

# Install uv binary from official Astral image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install dependencies using uv sync against frozen uv.lock
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Add virtualenv to PATH
ENV PATH="/app/.venv/bin:$PATH"

# Copy backend source
COPY backend/ ./backend/

# Copy frontend templates and static assets
COPY frontend/templates/ ./frontend/templates/
COPY frontend/static/ ./frontend/static/

WORKDIR /app/backend

# Expose port (Render uses 10000)
EXPOSE 10000

# Run FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
