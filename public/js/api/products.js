// Clase para manejar las llamadas a la API de productos
class ProductosAPI {
    constructor() {
        this.baseURL = '/api/products';
    }

    // Obtener todos los productos
    async obtenerTodos() {
        try {
            const response = await fetch(this.baseURL);
            if (!response.ok) throw new Error('Error al obtener productos');
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    // Obtener un producto por ID
    async obtenerPorId(id) {
        try {
            const response = await fetch(`${this.baseURL}/${id}`);
            if (!response.ok) throw new Error('Error al obtener producto');
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    // Obtener productos por categoría
    async obtenerPorCategoria(categoria) {
        try {
            const response = await fetch(`${this.baseURL}/categoria/${encodeURIComponent(categoria)}`);
            if (!response.ok) throw new Error('Error al obtener productos por categoría');
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    // Obtener productos por marca
    async obtenerPorMarca(marca) {
        try {
            const response = await fetch(`${this.baseURL}/marca/${encodeURIComponent(marca)}`);
            if (!response.ok) throw new Error('Error al obtener productos por marca');
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    // Buscar productos por término
    async buscar(termino) {
        try {
            const response = await fetch(`${this.baseURL}/buscar/${encodeURIComponent(termino)}`);
            if (!response.ok) throw new Error('Error al buscar productos');
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    // Obtener productos populares
    async obtenerPopulares(limite = 4) {
        try {
            const response = await fetch(`${this.baseURL}/populares/${limite}`);
            if (!response.ok) throw new Error('Error al obtener productos populares');
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }
}

// Exportar la clase para su uso en otros archivos
export const productosAPI = new ProductosAPI(); 