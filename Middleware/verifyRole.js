export const verifyRole = (allowedRoles) => {
    return (req, res, next) => {
        
        if (!req.user) return res.status(401).json({ message: "No user info" });

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied: insufficient role" });
        }

        next();
    };
};