# 🚀 Start all containers
podman start incubator-os-container incubator-os-mysql-container incubator-os-phpmyadmin-container

# 🛑 Stop all containers
podman stop incubator-os-mysql-container incubator-os-phpmyadmin-container incubator-os-container

# 📋 Check running containers
podman ps

# 📋 Check all containers (running + exited)
podman ps -a

# 🧹 Optional: Remove containers
podman rm incubator-os-container incubator-os-mysql-container incubator-os-phpmyadmin-container

# 🧼 Optional: Prune all stopped containers
podman container prune

# 📦 If using podman-compose (with podman-compose.yml)
podman-compose up        # Start all
podman-compose down      # Stop and remove all

