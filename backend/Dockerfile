FROM python:3.11-slim

RUN apt-get update && apt-get install -y build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /code

# instala dependências de runtime
COPY requirements.txt /code/
RUN pip install --no-cache-dir -U pip \
 && pip install --no-cache-dir -r requirements.txt

# copia o restante do código
COPY . /code

EXPOSE 8000
