const jwt = require("jsonwebtoken");

const adminGuard = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; 

    if (!token) {
        return res.status(401).json({ errors: ["Token não fornecido."] });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); 

        if (decoded.role !== "admin") {
            return res.status(403).json({ errors: ["Acesso negado. Somente administradores podem acessar esta rota."] });
        }

        req.user = decoded; 
        next(); 
    } catch (error) {
        return res.status(401).json({ errors: ["Token inválido."] });
    }
};

module.exports = adminGuard;
