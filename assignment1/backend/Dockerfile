FROM python:3.12-slim

# Set workdir to app
WORKDIR /usr/src/app

# Copy Python requirements
COPY requirements.txt /tmp/

# Copy the application code
COPY . /usr/src

# Copy the entrypoint script
COPY entryscript.sh /usr/src/entryscript.sh

# Install with pip
RUN pip install --upgrade pip
RUN pip install -r /tmp/requirements.txt

# Install bash since the base image uses sh by default
RUN apt-get update && apt-get install -y bash

# Make the entrypoint script executable
RUN chmod +x /usr/src/entryscript.sh

# Make sure python output is printed directly to stdout
ENV PYTHONUNBUFFERED=1

# Open listening port
EXPOSE 8080

# Start the app
CMD ["/bin/bash", "/usr/src/entryscript.sh"]

