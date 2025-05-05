FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set workdir
WORKDIR /usr/src/app

# Install system dependencies (like bash, if needed by entryscript)
# RUN apt-get update && apt-get install -y bash && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /tmp/
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy application code
# Ensure the 'app' directory exists in the build context (./backend)
COPY ./app /usr/src/app/app

# Expose port
EXPOSE 8080

# Command to run the application using uvicorn
# Runs the FastAPI app instance located in app/main.py
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]
