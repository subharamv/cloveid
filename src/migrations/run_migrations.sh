#!/bin/bash

# =====================================================
# CLOVE ID Maker - Migration Runner Script
# =====================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MIGRATIONS_DIR="$(dirname "$0")"
DB_URL="${SUPABASE_DB_URL:-}"
PROJECT_REF="${SUPABASE_PROJECT_REF:-}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v psql &> /dev/null; then
        log_error "psql is not installed. Please install PostgreSQL client."
        exit 1
    fi
    
    if [[ -z "$DB_URL" && -z "$PROJECT_REF" ]]; then
        log_error "Database connection not configured."
        log_info "Either set SUPABASE_DB_URL environment variable or install Supabase CLI and set SUPABASE_PROJECT_REF"
        exit 1
    fi
    
    log_success "Dependencies check passed"
}

run_migration_with_psql() {
    local migration_file="$1"
    local description="$2"
    
    log_info "Running migration: $description"
    log_info "File: $migration_file"
    
    if psql "$DB_URL" -f "$migration_file"; then
        log_success "Migration completed: $description"
        return 0
    else
        log_error "Migration failed: $description"
        return 1
    fi
}

run_migration_with_supabase() {
    local migration_file="$1"
    local description="$2"
    
    log_info "Running migration: $description"
    log_info "File: $migration_file"
    
    if supabase db push --db-url "postgresql://postgres.$PROJECT_REF.supabase.co:5432/postgres" < "$migration_file"; then
        log_success "Migration completed: $description"
        return 0
    else
        log_error "Migration failed: $description"
        return 1
    fi
}

verify_migration() {
    log_info "Verifying migration completion..."
    
    local verify_sql="
    SELECT 
        table_name,
        table_type
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
    "
    
    if [[ -n "$DB_URL" ]]; then
        echo "Tables in database:"
        psql "$DB_URL" -c "$verify_sql"
    else
        echo "Tables in database:"
        supabase db shell --command "$verify_sql"
    fi
}

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -v, --verify-only       Only verify current migrations (don't run new ones)"
    echo "  -s, --specific FILE     Run only specific migration file"
    echo ""
    echo "Environment Variables:"
    echo "  SUPABASE_DB_URL         Direct PostgreSQL connection string"
    echo "  SUPABASE_PROJECT_REF    Supabase project reference (if using CLI)"
    echo ""
    echo "Examples:"
    echo "  export SUPABASE_DB_URL=\"postgresql://user:pass@host:5432/db\""
    echo "  ./run_migrations.sh"
    echo ""
    echo "  export SUPABASE_PROJECT_REF=\"your-project-ref\""
    echo "  ./run_migrations.sh"
}

# Main execution
main() {
    local verify_only=false
    local specific_file=""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -v|--verify-only)
                verify_only=true
                shift
                ;;
            -s|--specific)
                specific_file="$2"
                shift 2
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    echo "=================================================="
    echo "CLOVE ID Maker - Database Migration Runner"
    echo "=================================================="
    echo ""
    
    # Check dependencies
    check_dependencies
    
    # Verify only mode
    if [[ "$verify_only" == true ]]; then
        verify_migration
        exit 0
    fi
    
    # Specific file mode
    if [[ -n "$specific_file" ]]; then
        if [[ ! -f "$specific_file" ]]; then
            log_error "Migration file not found: $specific_file"
            exit 1
        fi
        
        log_info "Running specific migration: $specific_file"
        if [[ -n "$DB_URL" ]]; then
            run_migration_with_psql "$specific_file" "Custom migration"
        else
            run_migration_with_supabase "$specific_file" "Custom migration"
        fi
        verify_migration
        exit 0
    fi
    
    # Run all migrations in order
    local migrations=(
        "000_schema_migrations.sql:Schema Migrations Table"
        "001_initial_schema.sql:Initial Database Schema"
    )
    
    log_info "Starting migration process..."
    
    for migration in "${migrations[@]}"; do
        IFS=':' read -r file_name description <<< "$migration"
        local file_path="$MIGRATIONS_DIR/$file_name"
        
        if [[ ! -f "$file_path" ]]; then
            log_error "Migration file not found: $file_path"
            exit 1
        fi
        
        if [[ -n "$DB_URL" ]]; then
            run_migration_with_psql "$file_path" "$description"
        else
            run_migration_with_supabase "$file_path" "$description"
        fi
        
        echo ""
    done
    
    log_success "All migrations completed successfully!"
    echo ""
    
    # Verify the setup
    verify_migration
    
    echo ""
    log_success "Migration process completed!"
    log_info "You can now start using the CLOVE ID Maker application."
}

# Trap errors and cleanup
trap 'log_error "Migration process interrupted."' INT TERM

# Run main function
main "$@"
