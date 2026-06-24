# get-qwenweaver

The one-command installer for QwenWeaver.

## Usage

```bash
curl -fsSL https://get.qwenweaver.io | sh
```

Or specify an install mode:

```bash
curl -fsSL https://get.qwenweaver.io | QWENWEAVER_INSTALL_MODE=docker sh
curl -fsSL https://get.qwenweaver.io | QWENWEAVER_INSTALL_MODE=git sh
```

## Local development

```bash
node server.js
# Serves install.sh at http://localhost:3000/install.sh
```

## Docker

```bash
docker build -t get-qwenweaver .
docker run -d -p 3000:3000 get-qwenweaver
```
