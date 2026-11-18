# Mux Cloud server image. Build from the repository root:
#   docker build -f docker/server/Dockerfile -t jchristn77/muxcloud-server:v0.1.0-alpha .
# Stage 1 builds the dashboard when src/MuxCloud.Dashboard exists; stage 2 publishes the server; stage 3 runs it.

FROM node:22-alpine AS dashboard
WORKDIR /src
COPY src/ ./src/
RUN mkdir -p /dashboard-dist \
    && if [ -f src/MuxCloud.Dashboard/package.json ]; then \
         cd src/MuxCloud.Dashboard && npm ci && npm run build && cp -r dist/. /dashboard-dist/; \
       fi

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/Directory.Build.props ./src/
COPY src/MuxCloud.Protocol/MuxCloud.Protocol.csproj ./src/MuxCloud.Protocol/
COPY src/MuxCloud.Core/MuxCloud.Core.csproj ./src/MuxCloud.Core/
COPY src/MuxCloud.Email/MuxCloud.Email.csproj ./src/MuxCloud.Email/
COPY src/MuxCloud.Server/MuxCloud.Server.csproj ./src/MuxCloud.Server/
RUN dotnet restore src/MuxCloud.Server/MuxCloud.Server.csproj
COPY src/MuxCloud.Protocol/ ./src/MuxCloud.Protocol/
COPY src/MuxCloud.Core/ ./src/MuxCloud.Core/
COPY src/MuxCloud.Email/ ./src/MuxCloud.Email/
COPY src/MuxCloud.Server/ ./src/MuxCloud.Server/
COPY assets/ ./assets/
COPY LICENSE.md ./
RUN dotnet publish src/MuxCloud.Server/MuxCloud.Server.csproj -c Release -f net10.0 -o /app /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app ./
COPY --from=dashboard /dashboard-dist/ ./dashboard/
RUN mkdir -p /app/data /app/logs /app/email-outbox && chown -R $APP_UID /app
USER $APP_UID
EXPOSE 8800
ENV MUXCLOUD_SETTINGS_FILE=/app/muxcloud.json
ENTRYPOINT ["dotnet", "MuxCloud.Server.dll"]
