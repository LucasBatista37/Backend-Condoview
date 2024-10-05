const User = require("../models/User");
const Condominium = require("../models/Condominium");

const associateUserToCondominium = async (req, res) => {
    const { email, condominiumId } = req.body;

    console.log("Associando usuário:", email, "ao condomínio:", condominiumId);

    try {
        const condominium = await Condominium.findById(condominiumId);
        if (!condominium) {
            return res.status(404).json({ errors: ["Condomínio não encontrado."] });
        }

        const user = await User.findOne({ email });
        console.log("Usuário encontrado:", user); 
        if (!user) {
            return res.status(404).json({ errors: ["Usuário não encontrado."] });
        }

        user.condominium = condominiumId;
        await user.save();

        return res.status(200).json({
            message: `Usuário ${user.name} foi associado ao condomínio ${condominium.name} com sucesso.`,
            user,
        });
    } catch (error) {
        console.error(error); 
        return res.status(500).json({
            errors: ["Erro ao associar usuário ao condomínio. Por favor, tente novamente."],
        });
    }
};

module.exports = {
  associateUserToCondominium,
};
