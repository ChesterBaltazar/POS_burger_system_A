import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ 
            message: "Access denied!!!" 
        });
    }
    
    const token = authHeader.split(" ")[1];
    
    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }
    
    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        
        req.user = decoded;
        
      
        if (!decoded.id || !decoded.role) {
            return res.status(403).json({ 
                message: "Invalid token structure" 
            });
        }
        
        next();
    } catch (err) {
        
        if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ 
                message: "Token expired",
                code: "TOKEN_EXPIRED"
            });
        }
        
        if (err instanceof jwt.JsonWebTokenError) {
            return res.status(403).json({ 
                message: "Invalid token",
                code: "INVALID_TOKEN"
            });
        }
        
        
        console.error("Token verification error:", err.message);
        res.status(500).json({ 
            message: "Internal server error during authentication" 
        });
    }
};

export const createAuthMiddleware = (options = {}) => {
    const { 
        optional = false, 
        roles = [], 
        allowExpired = false 
    } = options;
    
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        
        
        if (optional && (!authHeader || !authHeader.startsWith("Bearer "))) {
            return next();
        }
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ 
                message: "Access denied. No token provided." 
            });
        }
        
        const token = authHeader.split(" ")[1];
        
        try {
            const verifyOptions = allowExpired ? { ignoreExpiration: true } : {};
            const decoded = jwt.verify(token, process.env.JWT_SECRET, verifyOptions);
            
            req.user = decoded;
            
            
            if (roles.length > 0 && !roles.includes(decoded.role)) {
                return res.status(403).json({ 
                    message: "Insufficient permissions" 
                });
            }
            
            next();
        } catch (err) {
            if (err instanceof jwt.TokenExpiredError) {
                return res.status(401).json({ 
                    message: "Token expired. Please re-authenticate." 
                });
            }
            
            if (err instanceof jwt.JsonWebTokenError) {
                return res.status(403).json({ 
                    message: "Invalid authentication token" 
                });
            }
            
            console.error("Auth middleware error:", err);
            res.status(500).json({ 
                message: "Authentication error" 
            });
        }
    };
};

// import jwt from "jsonwebtoken";

// export const verifyToken = (req, res, next) => {
//     const token = req.headers.authorization?.split(" ")[1]; // "Bearer <token>"
//     if (!token) return res.status(401).json({ message: "No token" });

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         req.user = decoded; // attach user info to request
//         next();
//     } catch (err) {
//         res.status(403).json({ message: "Invalid token" });
//     }
// };