FROM ghcr.io/coder/coder:v2.36.4 AS coder_cli
FROM node:24.19.0-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates curl git openssh-client python3 python3-venv sudo tmux \
      ripgrep unzip && rm -rf /var/lib/apt/lists/* \
    && userdel node && useradd --uid 1000 --home-dir /workspace --create-home --shell /bin/bash coder \
    && echo 'coder ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/coder \
    && chmod 0440 /etc/sudoers.d/coder
COPY --from=coder_cli /opt/coder /usr/local/bin/coder
COPY . /opt/workbench
RUN npm install --global @openai/codex@0.153.4 \
    && python3 -m venv /opt/secenv \
    && /opt/secenv/bin/pip install --no-cache-dir /opt/workbench/tools/secenv \
    && ln -s /opt/secenv/bin/secenv /usr/local/bin/secenv \
    && chmod 0755 /opt/workbench/tools/vault/workbench-vault.py \
    && ln -s /opt/workbench/tools/vault/workbench-vault.py /usr/local/bin/workbench-vault \
    && python3 /opt/workbench/tools/obsidian-sync/adapter.py --directory /opt/workbench-sync \
    && chmod -R a+rX /opt/workbench-sync \
    && mkdir -p /workspace/projects /workspace/vault /workspace/.config/obsidian-headless /vault \
    && chown -R coder:coder /workspace /vault
USER coder
WORKDIR /workspace
ENV SHELL=/bin/bash
