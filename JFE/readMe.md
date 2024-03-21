# Jiriaf Front-End:

This guide outlines the deployment process for the JFE application, leveraging Docker, Docker Compose, and Docker Swarm for orchestration. The JFE application consists of two primary components: a client interface built with Angular 17, employing Angular Material for styling, and a backend server developed with Express and TypeScript. The application integrates MongoDB for data persistence and utilizes CILogon for authentication, ensuring secure access management.

## Deployment Guide

### Using Docker Compose

Deploying with Docker Compose simplifies managing application services, networks, and secrets. Follow these steps to deploy the Jiriaf Front-End application using Docker Compose in a Docker Swarm environment.

#### Prerequisites:

- **Docker**: Ensure Docker and Docker Compose are installed on your deployment environment.
- **Docker Swarm**: Your environment should be initialized for Docker Swarm. If not already set, you can initialize it with `docker swarm init`.
- **Docker Hub Account**: Required for hosting your Docker images. Alternatively, a private Docker registry can be used.
- **Secrets File**: Prepare a secrets file based on the provided template for secure configuration.

#### Preparing Docker Images

1. Build Docker images for the client and server:

   ```bash
   docker build -t <your-docker-username>/server:latest ./server --no-cache
   docker build -t <your-docker-username>/client:latest ./client --no-cache
   ```
2. Push the built images to Docker Hub or your private registry:

   ```bash
   docker push <your-docker-username>/server:latest
   docker push <your-docker-username>/client:latest
   ```

#### Setting Up Docker Swarm Secrets

Create necessary secrets for your application in Docker Swarm:

```bash
echo "<your-session-id>" | docker secret create SESSION_SECRET -
echo "<your-mongo-db-uri>" | docker secret create DB_URI -
echo "<your-cilogon-client-id>" | docker secret create CILOGON_CLIENT_ID -
echo "<your-cilogon-client-secret>" | docker secret create CILOGON_CLIENT_SECRET -
```

#### Configuring and Deploying with docker-compose.yaml

1. Rename `Docker-compose.template.yaml` to `docker-compose.yaml`. Replace placeholders under both `client` and `server` `image: <your-docker-username>/client:latest` with your Docker Hub username or your private Docker registry prefix.
2. Deploy your application stack to Docker Swarm: `docker stack deploy -c docker-compose.yaml jfe`
3. Stop deployment with: `docker stack rm jfe`.
4. Remove secrets with: `docker secret rm <secret_name>`.

The client interface should be accessible at `http://localhost:4200`, and the server should respond at `http://localhost:3000`.

*If you're deploying to a production environment, ensure to update the `Home URL` and `Callback URLs` in the CILogon configuration.*

### Deploying Locally

For local development, you can run both the client and the server directly on your machine. This approach requires setting up environment variables and secrets, then running each application using npm.

#### Setting Up Environment Variables

1. Copy the contents from `env.template` to a new `.env` file in the root of both the client and server directories.
2. Adjust the `.env` file contents to match your local development environment. Note: The `.env` file is not needed if you're deploying with Docker Swarm, as Docker Secrets will manage your sensitive configurations. *For local development with Docker Swarm see above.*

#### Running the Server

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server in development mode:
   ```bash
   npm run dev
   ```

#### Running the Client

1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the client application:
   ```bash
   npm start
   ```

## Contribution:

We welcome contributions from the community! If you'd like to contribute to the JFE application, please follow these guidelines:

1. **Fork the Repository** : Start by forking the project repository to your GitHub account.
2. **Create a Branch** : Create a branch in your forked repository for your changes. It's best to name the branch something descriptive about the changes you intend to make.
3. **Make Your Changes** : Implement your changes, additions, or fixes in your branch, adhering to the coding standards and guidelines of the project.
4. **Test Your Changes** : Ensure your changes do not introduce any breaking functionality. Test thoroughly in your environment.
5. **Submit a Pull Request** : Once your changes are ready and tested, submit a pull request (PR) against the main project repository. Include a clear description of the changes and any other relevant information for the project maintainers.
6. **Code Review** : Wait for the project maintainers to review your PR. Be open to feedback and willing to make additional adjustments as needed.

## Author:

**Patrick Meagher**

This project was developed by Patrick Meagher. Special thanks to all contributors who have helped shape this project.

#### Contact Information

For inquiries, suggestions, or contributions to the project, you can reach out to Patrick Meagher through the following channels:

* **Email** : [pmeagher@jlab.org]()
* **LinkedIn** : [Patrick Meagher](https://www.linkedin.com/in/patrick-meagher-244044291/)
* **GitHub** : [PatrickMeagher](https://github.com/MeagherPatrick)
