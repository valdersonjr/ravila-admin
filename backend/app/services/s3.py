import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException, status

from app.core.config import settings


def _client():
    return boto3.client(
        "s3",
        region_name=settings.AWS_S3_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
    )


def upload_contrato(file_bytes: bytes, contrato_id: int, filename: str) -> str:
    """Faz upload do arquivo assinado e retorna a key no S3."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "pdf"
    key = f"contratos/{contrato_id}/assinado.{ext}"
    try:
        _client().put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=key,
            Body=file_bytes,
            ContentType="application/pdf" if ext == "pdf" else f"image/{ext}",
        )
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro ao enviar arquivo para S3: {e}",
        )
    return key


def baixar_arquivo(key: str) -> bytes:
    """Baixa o arquivo do S3 e retorna os bytes."""
    try:
        obj = _client().get_object(Bucket=settings.AWS_S3_BUCKET, Key=key)
        return obj["Body"].read()
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro ao baixar arquivo do S3: {e}",
        )


def deletar_arquivo(key: str) -> None:
    try:
        _client().delete_object(Bucket=settings.AWS_S3_BUCKET, Key=key)
    except ClientError:
        pass
