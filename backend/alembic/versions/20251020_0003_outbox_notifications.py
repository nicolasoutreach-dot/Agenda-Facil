from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251020_0003'
down_revision = '20251020_0002'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('outbox',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('aggregate_type', sa.Text(), nullable=False),
        sa.Column('aggregate_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('event_type', sa.Text(), nullable=False),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('headers', postgresql.JSONB(astext_type=sa.Text())),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('published_at', sa.TIMESTAMP(timezone=True), nullable=True)
    )
    op.create_index('idx_outbox_unpublished', 'outbox', ['published_at'], postgresql_where=sa.text('published_at IS NULL'))

    op.create_table('notification_messages',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('channel', sa.Text(), nullable=False),
        sa.Column('recipient', sa.Text(), nullable=False),
        sa.Column('template', sa.Text(), nullable=False),
        sa.Column('variables', postgresql.JSONB(astext_type=sa.Text())),
        sa.Column('status', sa.Text(), nullable=False),
        sa.Column('attempts', sa.SmallInteger(), server_default=sa.text('0'), nullable=False),
        sa.Column('last_error', sa.Text()),
        sa.Column('appointment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('appointments.id'), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('sent_at', sa.TIMESTAMP(timezone=True))
    )
    op.create_check_constraint('notification_status_chk', 'notification_messages', "status in ('QUEUED','SENT','FAILED')")

def downgrade():
    op.drop_constraint('notification_status_chk', 'notification_messages', type_='check')
    op.drop_table('notification_messages')
    op.drop_index('idx_outbox_unpublished', table_name='outbox')
    op.drop_table('outbox')
