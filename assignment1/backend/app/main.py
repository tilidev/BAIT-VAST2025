import argparse
import sys
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routes.router import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # App startup
    print("Starting backend...")

    yield
    
    # App shutdown
    print("Shutting down backend...")

def main(args):
    print("Starting uvicorn")
    parser = argparse.ArgumentParser(description='AVA Template Python Backend')

    parser.add_argument('--port', type=int, default=8080, help='Port to run server on.')
    parser.add_argument('--dev', action='store_true',
                        help='If true, restart the server as changes occur to the code.')

    args = parser.parse_args(args)

    if args.dev:
        print(f"Serving on port {args.port} in development mode.")
        uvicorn.run("main:api_app", host="0.0.0.0", port=args.port, reload=True, access_log=False, workers=4)
    else:
        print(f"Serving on port {args.port} in live mode.")
        uvicorn.run("main:api_app", host="0.0.0.0", port=args.port, access_log=False, workers=4)


api_app = FastAPI(
    title="AVA Template Backend",
    description="""This is the AVA Template Backend""",
    version="1.0.0",
    lifespan=lifespan
)

# Allow CORS
api_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_app.include_router(router)

if __name__ == "__main__":
    main(sys.argv[1:])
