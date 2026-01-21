# Backend Utility Files - Organization Reference

This file documents the utility scripts, SQL migrations, and test files in `educators-edge-backend/` root directory that should be organized into proper folders.

## Recommended Folder Structure

```
educators-edge-backend/
├── migrations/           # SQL migration files
├── scripts/              # Utility and setup scripts
├── tests/                # Test files
├── debug/                # Debug scripts
└── assets/               # Resume templates, sample files
```

---

## Files to Organize

### SQL Migration Files → `migrations/`

| File | Purpose |
|------|---------|
| `add_calendly_fields.sql` | Add Calendly integration fields |
| `add_calendly_fields_enhanced.sql` | Enhanced Calendly fields |
| `add_calendly_fields_simple.sql` | Simple Calendly fields |
| `apply_db_fixes.sql` | General database fixes |
| `complete_ai_bot_database_schema.sql` | AI bot database schema |
| `create_ai_bot_essential_schema.sql` | Essential AI bot schema |
| `create_calendar_schema.sql` | Calendar schema |
| `create_calendar_schema_simple.sql` | Simple calendar schema |
| `create_dual_mode_session_schema.sql` | Dual mode session schema |
| `create_dual_mode_session_schema_fixed.sql` | Fixed dual mode schema |
| `create_dual_mode_sessions_safe.sql` | Safe dual mode sessions |
| `create_integrated_tracking_schema.sql` | Integrated tracking schema |
| `create_messages_table.sql` | Messages table |
| `create_messages_table_simple.sql` | Simple messages table |
| `create_session_documents_schema.sql` | Session documents schema |
| `create_session_tables.sql` | Session tables |
| `create_session_tables_clean.sql` | Clean session tables |
| `create_submissions_tracking_schema.sql` | Submissions tracking |
| `debug_ai_bots.sql` | Debug AI bots SQL |
| `debug_urgent_session.sql` | Debug urgent session SQL |
| `fix_ai_bot_conversations_table.sql` | Fix AI bot conversations |
| `fix_ai_bot_sessions.sql` | Fix AI bot sessions |
| `fix_ai_bot_sessions_table.sql` | Fix AI bot sessions table |
| `fix_chat_session_link.sql` | Fix chat session link |
| `fix_document_id.sql` | Fix document ID |
| `fix_dual_mode_sessions_fkey.sql` | Fix dual mode foreign key |
| `fix_foreign_key_issue.sql` | Fix foreign key issue |
| `fix_lessons_notifications.sql` | Fix lessons notifications |
| `fix_sender_type_constraint.sql` | Fix sender type constraint |
| `fix_session_tables.sql` | Fix session tables |
| `insert-multilang-course.sql` | Insert multilang course |
| `zenith_trade_migration.sql` | Trading simulation migration |

---

### Setup & Utility Scripts → `scripts/`

| File | Purpose |
|------|---------|
| `add_session_mode.js` | Add session mode utility |
| `create-working-multilang-course.js` | Create multilang course |
| `ecosystem.config.js` | PM2 ecosystem config |
| `enhancedLeetCodeGenerator.js` | Enhanced LeetCode generator |
| `get-network-info.js` | Network info utility |
| `leetcodeTestValidator.js` | LeetCode test validator |
| `populate_simulation_data.js` | Populate simulation data |
| `populate_with_alpha_vantage.js` | Populate with Alpha Vantage |
| `render.yaml` | Render deployment config |
| `setupEnhancedLeetCode.js` | Setup enhanced LeetCode |
| `setup_submissions_schema.js` | Setup submissions schema |
| `simple_populate.js` | Simple data population |
| `ultimateCourseGenerator.js` | Ultimate course generator |

---

### Test Files → `tests/`

| File | Purpose |
|------|---------|
| `test-anthropic-key.js` | Test Anthropic API key |
| `test-clean-integration.js` | Clean integration test |
| `test-direct-execution.js` | Direct execution test |
| `test-document-flow.js` | Document flow test |
| `test-dynamic-recording.js` | Dynamic recording test |
| `test-endpoint-direct.js` | Direct endpoint test |
| `test-enhanced-course-generation.js` | Enhanced course generation test |
| `test-function-detection.js` | Function detection test |
| `test-gemini-endpoint.js` | Gemini endpoint test |
| `test-judge0-auth.js` | Judge0 auth test |
| `test-judge0-integration.js` | Judge0 integration test |
| `test-judge0-raw.js` | Judge0 raw test |
| `test-judge0-simple.js` | Judge0 simple test |
| `test-leetcode-integration.js` | LeetCode integration test |
| `test-leetcode-system.js` | LeetCode system test |
| `test-puppeteer-direct.js` | Puppeteer direct test |
| `test-real-resume-export.js` | Real resume export test |
| `test-resume-export.js` | Resume export test |
| `test-semantic-dom-pipeline.js` | Semantic DOM pipeline test |
| `test-terminal-output.js` | Terminal output test |
| `testLeetCodeAPIs.js` | LeetCode APIs test |
| `test_actual_api.js` | Actual API test |
| `test_ai_comments_api.js` | AI comments API test |
| `test_ai_comments_endpoint.js` | AI comments endpoint test |
| `test_api_authenticated.js` | Authenticated API test |
| `test_api_endpoint.js` | API endpoint test |
| `test_calendly_url.js` | Calendly URL test |
| `test_claude_endpoint.js` | Claude endpoint test |
| `test_claude_real.js` | Real Claude test |
| `test_course_debug.js` | Course debug test |
| `test_db_simple.js` | Simple DB test |
| `test_full_ai_comments.js` | Full AI comments test |
| `test_gemini.js` | Gemini test |
| `test_language_switch.js` | Language switch test |
| `test_profiles.js` | Profiles test |
| `test_session_documents.js` | Session documents test |
| `test_session_flow.js` | Session flow test |
| `test_session_query.js` | Session query test |
| `test_smart_prompt_workflow.js` | Smart prompt workflow test |
| `test_student_booking.js` | Student booking test |
| `verify_data.js` | Verify data script |

---

### Debug Scripts → `debug/`

| File | Purpose |
|------|---------|
| `check_ai_bots.js` | Check AI bots |
| `check_ai_comment_tables.js` | Check AI comment tables |
| `check_ai_tables.js` | Check AI tables |
| `check_enhanced_courses.js` | Check enhanced courses |
| `check_market_data_date.js` | Check market data date |
| `check_session_mode.js` | Check session mode |
| `check_user_calendly.js` | Check user Calendly |
| `debug_ai_bots.sql` | Debug AI bots |
| `debug_course_published.js` | Debug course published |
| `debug_live_sessions.js` | Debug live sessions |
| `debug_market_data.js` | Debug market data |
| `debug_new_course.js` | Debug new course |
| `debug_session_accept.js` | Debug session accept |
| `debug_session_request.js` | Debug session request |
| `debug_session_requests.js` | Debug session requests |

---

### Assets & Sample Files → `assets/`

| File | Purpose |
|------|---------|
| `bilal-resume.docx` | Sample resume (DOCX) |
| `bilal-resume.html` | Sample resume (HTML) |
| `bilal-resume.pdf` | Sample resume (PDF) |
| `test-resume.docx` | Test resume (DOCX) |
| `test-resume.html` | Test resume (HTML) |
| `test-resume.pdf` | Test resume (PDF) |
| `test-simple.pdf` | Simple test PDF |
| `index.html` | Index HTML file |

---

### Configuration Files (Keep in Root)

| File | Purpose |
|------|---------|
| `package.json` | NPM package config |
| `package-lock.json` | NPM lock file |
| `ecosystem.config.js` | PM2 config |
| `render.yaml` | Render deployment |
| `deploy-commands.txt` | Deployment commands |

---

## Organization Commands

To organize these files, run the following commands from `educators-edge-backend/`:

```bash
# Create directories
mkdir -p migrations scripts tests debug assets

# Move SQL files
mv *.sql migrations/

# Move test files
mv test*.js tests/
mv *Test*.js tests/

# Move debug files
mv check_*.js debug/
mv debug_*.js debug/

# Move utility scripts
mv *Generator*.js scripts/
mv *populate*.js scripts/
mv setup*.js scripts/

# Move assets
mv *.pdf assets/
mv *.docx assets/
mv *.html assets/ 2>/dev/null || true
```

---

## Notes

- These files were created during development (3-5 months ago)
- Many are one-time migration scripts that may no longer be needed
- Test files should be reviewed and either integrated into a proper test suite or removed
- Debug scripts are useful for troubleshooting but could be consolidated

---

**Last Updated:** January 2026
