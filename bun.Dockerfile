FROM debian:stable-slim

RUN \
  apt update && \
  apt upgrade -y && \
  apt install -y curl unzip

RUN adduser --uid 1000 --ingroup users --disabled-password --shell /bin/bash wgr

USER wgr
WORKDIR /home/wgr

RUN curl -fsSL https://bun.sh/install | bash

ENV BUN_INSTALL="/home/wgr/.bun"
ENV PATH="${BUN_INSTALL}/bin:${PATH}"

COPY . /home/wgr/

RUN bun --version > /home/wgr/bun-version.txt
RUN bun install

ENTRYPOINT [ "bun" ]
CMD [ "run", "--watch", "./server.ts" ]
