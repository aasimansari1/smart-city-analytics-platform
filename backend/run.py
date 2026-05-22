import uvicorn
import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    reload = os.environ.get("RENDER") is None  # no hot-reload in production
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=reload)
