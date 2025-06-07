import { getRegiones, getCiudadesPorRegion } from './data/chile-regiones-ciudades.js';

// Clase para manejar los selectores de región y ciudad
class RegionCiudadManager {
    constructor() {
        this.regionSelect = null;
        this.ciudadSelect = null;
        this.init();
    }

    init() {
        // Esperar a que el DOM esté cargado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupSelectors());
        } else {
            this.setupSelectors();
        }
    }

    setupSelectors() {
        this.regionSelect = document.getElementById('regionEmpresa');
        this.ciudadSelect = document.getElementById('ciudadEmpresa');

        if (!this.regionSelect || !this.ciudadSelect) {
            console.log('Selectores de región/ciudad no encontrados en esta página');
            return;
        }

        // Cargar las regiones
        this.loadRegiones();

        // Configurar evento de cambio de región
        this.regionSelect.addEventListener('change', (e) => {
            this.onRegionChange(e.target.value);
        });
    }

    loadRegiones() {
        try {
            const regiones = getRegiones();
            
            // Limpiar opciones existentes (mantener la primera opción)
            this.regionSelect.innerHTML = '<option value="">Selecciona una región</option>';
            
            // Agregar todas las regiones
            regiones.forEach(region => {
                const option = document.createElement('option');
                option.value = region;
                option.textContent = region;
                this.regionSelect.appendChild(option);
            });

            console.log(`Cargadas ${regiones.length} regiones`);
        } catch (error) {
            console.error('Error al cargar regiones:', error);
        }
    }

    onRegionChange(selectedRegion) {
        // Resetear el selector de ciudades
        this.ciudadSelect.innerHTML = '<option value="">Selecciona una ciudad</option>';
        
        if (!selectedRegion) {
            this.ciudadSelect.disabled = true;
            this.ciudadSelect.innerHTML = '<option value="">Primero selecciona una región</option>';
            return;
        }

        try {
            const ciudades = getCiudadesPorRegion(selectedRegion);
            
            if (ciudades.length === 0) {
                this.ciudadSelect.innerHTML = '<option value="">No hay ciudades disponibles</option>';
                this.ciudadSelect.disabled = true;
                return;
            }

            // Habilitar el selector de ciudades
            this.ciudadSelect.disabled = false;
            
            // Agregar todas las ciudades de la región seleccionada
            ciudades.forEach(ciudad => {
                const option = document.createElement('option');
                option.value = ciudad;
                option.textContent = ciudad;
                this.ciudadSelect.appendChild(option);
            });

            console.log(`Cargadas ${ciudades.length} ciudades para ${selectedRegion}`);
        } catch (error) {
            console.error('Error al cargar ciudades:', error);
            this.ciudadSelect.innerHTML = '<option value="">Error al cargar ciudades</option>';
            this.ciudadSelect.disabled = true;
        }
    }

    // Método para obtener los valores seleccionados
    getSelectedValues() {
        return {
            region: this.regionSelect ? this.regionSelect.value : '',
            ciudad: this.ciudadSelect ? this.ciudadSelect.value : ''
        };
    }

    // Método para establecer valores (útil para edición)
    setValues(region, ciudad) {
        if (this.regionSelect && region) {
            this.regionSelect.value = region;
            this.onRegionChange(region);
            
            // Esperar un poco para que se carguen las ciudades y luego seleccionar la ciudad
            setTimeout(() => {
                if (this.ciudadSelect && ciudad) {
                    this.ciudadSelect.value = ciudad;
                }
            }, 100);
        }
    }

    // Método para validar que ambos valores estén seleccionados
    validate() {
        const values = this.getSelectedValues();
        return values.region && values.ciudad;
    }
}

// Crear instancia global
const regionCiudadManager = new RegionCiudadManager();

// Exportar para uso externo si es necesario
window.regionCiudadManager = regionCiudadManager;

export default regionCiudadManager; 