"""initial users and cv tables

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-18 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0001_initial'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    op.create_table('cv_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_type', sa.String(length=10), nullable=False),
        sa.Column('file_hash', sa.String(length=64), nullable=False),
        sa.Column('raw_text', sa.Text(), nullable=True),
        sa.Column('cv_data', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.String(length=1), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('cv_usage_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('cv_document_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action', sa.Enum('job_search', 'interview', 'company_research', name='usageaction'), nullable=False),
        sa.Column('input_snapshot', sa.JSON(), nullable=True),
        sa.Column('result_snapshot', sa.JSON(), nullable=True),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['cv_document_id'], ['cv_documents.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('cv_usage_history')
    op.drop_table('cv_documents')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
