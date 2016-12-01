# GithubIssueTracker

An angular dashboard for tracking issues of any github repository.

Input : a link to any public GitHub repository

Output :UI displays a table with the following information -
- Total number of open issues
- Number of open issues that were opened in the last 24 hours
- Number of open issues that were opened more than 24 hours ago but less than 7 days ago
- Number of open issues that were opened more than 7 days ago 

# Improvements:
- Separate directives factories and controllers into multiple files
- Use moment.js for parsing datetime of a GitHub issue
- Refactor code if more fucntionality is required
- Use view templating if more views are added
- Use d3.js to show better visuals for the KPIs
- Add caching layer using localstorage/Redis
- Make application deployable to Heroku.
- Setup build tasks to:
-- Minify the app.js
-- Bundle the JS files together
-- Bundle the CSS files together
