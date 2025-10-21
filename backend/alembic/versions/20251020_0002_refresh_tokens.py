from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251020_0002'
down_revision = '20251020_0001'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('refresh_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.Text(), nullable=False),
        sa.Column('expires_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('revoked_at', sa.TIMESTAMP(timezone=True), nullable=True)
    )
    op.create_index('idx_refresh_user', 'refresh_tokens', ['user_id'])
    op.create_index('idx_refresh_valid', 'refresh_tokens', ['expires_at'], postgresql_where=sa.text('revoked_at IS NULL'))

def downgrade():
    op.drop_index('idx_refresh_valid', table_name='refresh_tokens')
    op.drop_index('idx_refresh_user', table_name='refresh_tokens')
    op.drop_table('refresh_tokens')
