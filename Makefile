# Build the Docker image
build:
    docker build -t mybot .

# Run the Docker container in the foreground
run:
    docker run -it mybot

# Stop the Docker container
stop:
    docker stop $(docker ps -q --filter ancestor=mybot)

# Remove the Docker container
rm:
    docker rm $(docker ps -a -q --filter ancestor=mybot)

# Push the Docker image to a container registry
push:
    docker tag mybot myregistry/mybot:latest
    docker push myregistry/mybot:latest

# Pull the Docker image from a container registry
pull:
    docker pull myregistry/mybot:latest

# Deploy the Docker container to a remote host
deploy:
    ssh user@remote_host "docker pull myregistry/mybot:latest && docker run -d --name mybot myregistry/mybot:latest"

# View the logs from the Docker container
logs:
    docker logs -f $(docker ps -q --filter ancestor=mybot)

# Run tests using pytest
test:
    docker run --rm -v $(pwd):/app -w /app python:3.8-slim-buster pytest
