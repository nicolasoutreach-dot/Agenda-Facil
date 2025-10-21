from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251020_0001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.Text(), nullable=False, unique=True),
        sa.Column('password_hash', sa.Text(), nullable=False),
        sa.Column('full_name', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_table('establishments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_table('providers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('establishment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('establishments.id'), nullable=True),
        sa.Column('display_name', sa.Text(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_providers_est', 'providers', ['establishment_id'])

    op.create_table('provider_work_hours',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('provider_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('providers.id'), nullable=False),
        sa.Column('weekday', sa.SmallInteger(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
    )
    op.create_unique_constraint('uq_work_hours_block', 'provider_work_hours', ['provider_id','weekday','start_time','end_time'])

    op.create_table('appointments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('provider_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('providers.id'), nullable=False),
        sa.Column('starts_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('ends_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('status', sa.Text(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    # Partial unique index for provider slot (pending/confirmed)
    op.execute("""
        CREATE UNIQUE INDEX uq_appointments_provider_slot
        ON appointments(provider_id, starts_at)
        WHERE status IN ('PENDING','CONFIRMED');
    """)

def downgrade():
    op.execute("DROP INDEX IF EXISTS uq_appointments_provider_slot;")
    op.drop_table('appointments')
    op.drop_constraint('uq_work_hours_block','provider_work_hours', type_='unique')
    op.drop_table('provider_work_hours')
    op.drop_index('idx_providers_est', table_name='providers')
    op.drop_table('providers')
    op.drop_table('establishments')
    op.drop_table('users')
