FROM alpine

RUN \
  apk --no-cache add bash curl

RUN \
  curl -fsSL https://bun.sh/install | bash

ENTRYPOINT [ "/bin/bash" ]
