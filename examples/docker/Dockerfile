FROM denoland/deno:debian-1.31.1

# Copy application
RUN mkdir /app
COPY . /app/

# Install pup - Pin this url to a specific version in production
RUN ["deno","install","-An","pup", "https://deno.land/x/pup/pup.ts"]

# Copy entrypoint
RUN ["chmod", "+x", "/app/entrypoint.sh"]

# Go!
ENTRYPOINT ["/app/entrypoint.sh"]