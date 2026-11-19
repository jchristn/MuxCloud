# mux hub for the app-review demo machine. Build from a Mux checkout:
#   docker buildx build --platform linux/amd64 -f docker/demo/mux.Dockerfile -t muxcloud-demo-mux:local ~/Code/Mux
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish src/Mux.Cli/Mux.Cli.csproj -c Release -f net10.0 -o /out -p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0
RUN apt-get update && apt-get install -y --no-install-recommends curl git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /out ./
RUN printf '#!/bin/sh\nexec dotnet /app/Mux.Cli.dll "$@"\n' > /usr/local/bin/mux && chmod +x /usr/local/bin/mux
ENV MUX_CONFIG_DIR=/config
WORKDIR /workspace
ENTRYPOINT ["mux"]
CMD ["serve", "--host", "127.0.0.1", "--port", "8000"]
