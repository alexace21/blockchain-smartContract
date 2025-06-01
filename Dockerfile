# Use a slim Node.js base image for smaller image size
FROM node:18-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
# A wildcard is used to ensure both package.json and package-lock.json are copied
COPY package*.json ./

# Install project dependencies.
# --omit=dev ensures dev dependencies are not installed in the production image.
# For local development where you might need `nodemon` inside the container,
# you could run `npm install` without --omit=dev, or have a separate dev Dockerfile.
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Expose the port your Express app listens on
EXPOSE 3005

# Define the command to run your application
# Ensure your package.json has a "start" script: "node server.js" or "node app.js"
CMD [ "npm", "start" ]
