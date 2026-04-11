# Fix bug

## Workflow Steps

### [x] Step: Investigation and Planning

Analyze the bug report and design a solution.

1. Review the bug description, error messages, and logs
2. Clarify reproduction steps with the user if unclear
3. Check existing tests for clues about expected behavior
4. Locate relevant code sections and identify root cause
5. Propose a fix based on the investigation
6. Consider edge cases and potential side effects

Save findings to `/Users/adminuser/vsc/cc_checker/.zencoder/chats/648f93c1-8b2a-4f5a-ad1e-b3bb5e368df3/investigation.md` with:

- Bug summary
- Root cause analysis
- Affected components
- Proposed solution

**Stop here.** Present the investigation findings to the user and wait for their confirmation before proceeding.

### [x] Step: Implementation

Read `/Users/adminuser/vsc/cc_checker/.zencoder/chats/648f93c1-8b2a-4f5a-ad1e-b3bb5e368df3/investigation.md`
Implement the bug fix.

1. Add/adjust regression test(s) that fail before the fix and pass after
2. Implement the fix
3. Run relevant tests
4. Update `/Users/adminuser/vsc/cc_checker/.zencoder/chats/648f93c1-8b2a-4f5a-ad1e-b3bb5e368df3/investigation.md` with implementation notes and test results

If blocked or uncertain, ask the user for direction.

### [x] Step: Fix Expo Dev Server (Port 8085)

Resolve the 404 error on `entry.bundle` and ensure the Expo dev server is fully functional.

1. Investigate why `entry.bundle` returns 404 on port 8085
2. Check Expo/Metro configuration and entry points
3. Fix the configuration to ensure the bundle is correctly served
4. Verify by accessing `http://localhost:8085` and ensuring the app loads correctly

### [x] Step: Fix API Connection Refused

Investigate and resolve the "connection refused" error for the backend API.

1. Check if the backend server is running and listening on the expected port (8000)
2. Verify API endpoint configuration in the frontend
3. Check for any CORS or network configuration issues
4. Ensure the backend handles requests correctly and is accessible from the frontend

### [x] Step: Run using Railway

Configure and verify the application when running with a Railway-hosted backend.

1. Ensure `start-railway.sh` correctly points to the Railway backend
2. Verify frontend `EXPO_PUBLIC_API_URL` environment variable is correctly set
3. Test communication between local frontend and Railway backend
4. Address any production-specific issues (CORS, SSL, etc.)

### [x] Step: Fix MaxListenersExceededWarning in Backend

Investigate and resolve the `MaxListenersExceededWarning` in the backend, likely caused by log streaming or file watching.

1. Locate the code responsible for adding listeners to `StatWatcher` or similar event emitters
2. Ensure listeners are properly removed when connections are closed or no longer needed
3. Increase the limit if necessary, but prioritize proper cleanup to avoid memory leaks
4. Verify the fix by monitoring backend logs during log streaming activities
