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


def upload_foto(file_bytes: bytes, user_id: int, filename: str) -> str:
    """Faz upload de foto de perfil e retorna a key no S3."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    key = f"fotos/users/{user_id}/perfil.{ext}"
    try:
        _client().put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=key,
            Body=file_bytes,
            ContentType=f"image/{ext}",
        )
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro ao enviar foto para S3: {e}",
        )
    return key


def gerar_url_temporaria(key: str, expires_in: int = 3600) -> str:
    """Gera uma URL pré-assinada para acesso temporário ao arquivo."""
    try:
        return _client().generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.AWS_S3_BUCKET, "Key": key},
            ExpiresIn=expires_in,
        )
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro ao gerar URL: {e}",
        )


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


def upload_material(file_bytes: bytes, material_id: int, filename: str) -> str:
    """Faz upload de material didático e retorna a key no S3."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    key = f"materiais/{material_id}/arquivo.{ext}"
    content_type_map = {
        "pdf": "application/pdf",
        "mp4": "video/mp4",
        "mov": "video/quicktime",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "gif": "image/gif",
    }
    content_type = content_type_map.get(ext, "application/octet-stream")
    try:
        _client().put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro ao enviar arquivo para S3: {e}",
        )
    return key


def deletar_arquivo(key: str) -> None:
    try:
        _client().delete_object(Bucket=settings.AWS_S3_BUCKET, Key=key)
    except ClientError:
        pass
