import api from "../../services/api";

const useVersion = () => {

    const getVersion = async () => {
        const { data } = await api.request({
            url: '/version',
            method: 'GET',
        });
        return data;
    }

    const setVersion = async (version) => {
        if (!version) return null;
        try {
            const { data } = await api.request({
                url: '/version',
                method: 'POST',
                data: { version }
            });
            return data;
        } catch (e) {
            // não bloquear UI por falha de atualização da versão
            return null;
        }
    }

    return {
        getVersion,
        setVersion
    }
}

export default useVersion;



