// This middleware checks if the authenticated user has the 'teacher' role.
exports.isTeacher = (req, res, next) => {
    // NEW: Add this console.log to see what the server is getting.
    console.log("isTeacher middleware check. User object received:", req.user);

    if (req.user && req.user.role === 'teacher') {
        next(); // User is a teacher, proceed to the next function (the controller).
    } else {
        // User is not a teacher, send a "Forbidden" error.
        res.status(403).json({ error: 'Access denied. Teacher role required.' });
    }
};