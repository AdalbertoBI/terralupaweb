// ========== ARQUIVO ADICIONAL PARA ORGANIZAÇÃO DOS FILTROS ==========
// Este arquivo pode ser incluído separadamente se desejar modularizar

const FilterLibrary = {
    // Lista completa de todos os filtros disponíveis
    filterList: [
        { id: 0, name: "normal", displayName: "Normal" },
        { id: 1, name: "vermelho", displayName: "Vermelho" },
        { id: 2, name: "verde", displayName: "Verde" },
        { id: 3, name: "azul", displayName: "Azul" },
        { id: 4, name: "grayscale", displayName: "Cinza" },
        { id: 5, name: "invert", displayName: "Invertido" },
        { id: 6, name: "sepia", displayName: "Sépia" },
        { id: 7, name: "solarize", displayName: "Solarizado" },
        { id: 8, name: "blur", displayName: "Desfoque" },
        { id: 9, name: "sharpen", displayName: "Nitidez" },
        { id: 10, name: "vintage", displayName: "Vintage" },
        { id: 11, name: "posterize", displayName: "Posterizado" },
        { id: 12, name: "yellow-invert", displayName: "Amarelo-Preto" },
        { id: 13, name: "green-dominant", displayName: "Verde Dominante" },
        { id: 14, name: "blue-yellow-post", displayName: "Azul-Amarelo" },
        { id: 15, name: "gray-natural", displayName: "Cinza Natural" },
        { id: 16, name: "black-white-hard", displayName: "P&B Alto Contraste" },
        { id: 17, name: "black-white-soft", displayName: "P&B Suave" },
        { id: 18, name: "blue-vibrant", displayName: "Azul Vibrante" }
    ],

    // Função para obter informações de um filtro
    getFilterInfo: function(index) {
        return this.filterList[index] || this.filterList[0];
    },

    // Função para obter o total de filtros
    getTotalFilters: function() {
        return this.filterList.length;
    }
};

// Exportar para uso global (opcional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterLibrary;
}
