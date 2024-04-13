FROM denoland/deno:debian-1.31.1

# Copy application
RUN mkdir /app
COPY . /app/

# Install pup - Pin this url to a specific version in production
RUN ["deno","install","-An","pup", "jsr:@pup/pup"]

# Go!
ENTRYPOINT ["sh", "-c", "cd /app && pup run"]