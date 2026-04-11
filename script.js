// Cambiar el estilo de la navegación al hacer scroll
window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.style.padding = '0.5rem 5%';
        header.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    } else {
        header.style.padding = '1rem 5%';
        header.style.backgroundColor = '#fff';
    }
});

// Actualizar año actual en el footer
function updateCurrentYear() {
    const currentYearElement = document.getElementById('currentYear');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }
}

// Sistema de Agenda Virtual
class AgendaVirtual {
    constructor() {
        this.citas = JSON.parse(localStorage.getItem('citas')) || [];
        this.currentWeekOffset = 0;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupModalListeners();
        this.setupFormValidation();
        this.setMinDate();
        this.cargarCitas();
        this.setupNavigation();
    }

    setupEventListeners() {
        // Botones de agendar en cada servicio
        document.querySelectorAll('.btn-agendar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const servicio = e.target.getAttribute('data-service');
                this.openModal(servicio);
            });
        });
    }

    setupModalListeners() {
        const modal = document.getElementById('modalAgendamiento');
        const closeBtn = document.querySelector('.close');
        const confirmModal = document.getElementById('modalConfirmacion');
        const closeConfirmBtn = document.querySelector('.btn-close-modal');

        closeBtn.addEventListener('click', () => this.closeModal());
        closeConfirmBtn.addEventListener('click', () => this.closeConfirmationModal());

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
            if (e.target === confirmModal) {
                this.closeConfirmationModal();
            }
        });
    }

    setupFormValidation() {
        const form = document.getElementById('formAgendamiento');
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Validación de nombre - solo letras
        document.getElementById('nombre').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^A-Za-zÁáÉéÍíÓóÚúÑñ\s]/g, '');
            this.checkFormCompletion();
        });

        // Validación de RUT en tiempo real
        document.getElementById('rut').addEventListener('input', (e) => {
            this.formatRUT(e.target);
            this.checkFormCompletion();
        });

        // Validación de servicio
        document.getElementById('servicio').addEventListener('change', () => {
            this.checkFormCompletion();
        });

        // Validación de fecha
        document.getElementById('fecha').addEventListener('change', () => {
            this.actualizarHorasDisponibles();
            this.checkFormCompletion();
        });

        // Validación de hora
        document.getElementById('hora').addEventListener('change', () => {
            this.checkFormCompletion();
        });

        // Validación de teléfono
        document.getElementById('telefono').addEventListener('input', () => {
            this.checkFormCompletion();
        });
    }

    checkFormCompletion() {
        const nombre = document.getElementById('nombre').value.trim();
        const rut = document.getElementById('rut').value.trim();
        const servicio = document.getElementById('servicio').value.trim();
        const fecha = document.getElementById('fecha').value;
        const hora = document.getElementById('hora').value;
        const telefono = document.getElementById('telefono').value.trim();

        const isFormValid = nombre.length >= 3 && 
                           rut && this.validateRUT(rut) && 
                           servicio && 
                           fecha && 
                           hora;

        const submitBtn = document.querySelector('.btn-submit');
        if (isFormValid) {
            submitBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
            submitBtn.style.boxShadow = '0 4px 15px rgba(40, 167, 69, 0.3)';
            submitBtn.style.transform = 'translateY(-2px)';
        } else {
            submitBtn.style.background = 'var(--primary)';
            submitBtn.style.boxShadow = 'none';
            submitBtn.style.transform = 'none';
        }
    }

    setMinDate() {
        const fechaInput = document.getElementById('fecha');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        fechaInput.min = tomorrow.toISOString().split('T')[0];
        
        // Actualizar horas disponibles cuando cambie la fecha
        fechaInput.addEventListener('change', () => {
            this.actualizarHorasDisponibles();
        });
    }

    actualizarHorasDisponibles() {
        const fechaSeleccionada = document.getElementById('fecha').value;
        const horaSelect = document.getElementById('hora');
        
        if (!fechaSeleccionada) {
            horaSelect.innerHTML = '<option value="">Seleccionar fecha primero</option>';
            return;
        }
        
        // Horas de 10 AM a 6 PM
        const todasLasHoras = [
            '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
        ];
        
        // Filtrar horas ya agendadas para esa fecha
        const horasOcupadas = this.citas
            .filter(cita => cita.fecha === fechaSeleccionada && cita.estado !== 'cancelada')
            .map(cita => cita.hora);
        
        // Obtener horas disponibles
        const horasDisponibles = todasLasHoras.filter(hora => !horasOcupadas.includes(hora));
        
        // Actualizar el select
        horaSelect.innerHTML = '<option value="">Seleccionar hora</option>';
        horasDisponibles.forEach(hora => {
            horaSelect.innerHTML += `<option value="${hora}">${hora}</option>`;
        });
        
        // Si no hay horas disponibles, mostrar mensaje
        if (horasDisponibles.length === 0) {
            horaSelect.innerHTML = '<option value="">No hay horas disponibles</option>';
        }
    }

    openModal(servicio) {
        const modal = document.getElementById('modalAgendamiento');
        const servicioInput = document.getElementById('servicio');
        servicioInput.value = servicio;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Limpiar el campo de fecha al abrir el modal
        document.getElementById('fecha').value = '';
        document.getElementById('hora').innerHTML = '<option value="">Seleccionar fecha primero</option>';
    }

    closeModal() {
        const modal = document.getElementById('modalAgendamiento');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        document.getElementById('formAgendamiento').reset();
        document.getElementById('hora').innerHTML = '<option value="">Seleccionar fecha primero</option>';
    }

    formatRUT(input) {
        let value = input.value.replace(/[^\dKk]/g, '');
        
        if (value.length > 1) {
            const cuerpo = value.slice(0, -1);
            const dv = value.slice(-1).toUpperCase();
            const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            value = cuerpoFormateado + '-' + dv;
        }
        
        input.value = value;
    }

    validateRUT(rut) {
        const cleanRUT = rut.replace(/[^\dKk]/g, '');
        if (cleanRUT.length < 8 || cleanRUT.length > 9) return false;
        
        const cuerpo = cleanRUT.slice(0, -1);
        const dv = cleanRUT.slice(-1).toUpperCase();
        
        let suma = 0;
        let multiplo = 2;
        
        for (let i = cuerpo.length - 1; i >= 0; i--) {
            suma += parseInt(cuerpo[i]) * multiplo;
            multiplo = multiplo === 7 ? 2 : multiplo + 1;
        }
        
        const dvEsperado = 11 - (suma % 11);
        const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
        
        return dv === dvCalculado;
    }

    validateForm() {
        const nombre = document.getElementById('nombre').value.trim();
        const rut = document.getElementById('rut').value.trim();
        const servicio = document.getElementById('servicio').value.trim();
        const fecha = document.getElementById('fecha').value;
        const hora = document.getElementById('hora').value;

        if (!nombre || nombre.length < 3) {
            this.showError('El nombre debe tener al menos 3 caracteres');
            return false;
        }

        if (!rut || !this.validateRUT(rut)) {
            this.showError('El RUT ingresado no es válido');
            return false;
        }

        if (!servicio) {
            this.showError('Debe seleccionar un servicio');
            return false;
        }

        if (!fecha) {
            this.showError('Debe seleccionar una fecha');
            return false;
        }

        if (!hora) {
            this.showError('Debe seleccionar una hora');
            return false;
        }

        // Verificar conflicto de horario
        if (this.existeConflicto(fecha, hora)) {
            this.showError('Ya existe una cita agendada para esta fecha y hora');
            return false;
        }

        return true;
    }

    existeConflicto(fecha, hora) {
        return this.citas.some(cita => 
            cita.fecha === fecha && cita.hora === hora && cita.estado !== 'cancelada'
        );
    }

    handleSubmit() {
        if (!this.validateForm()) return;

        const cita = {
            id: Date.now(),
            nombre: document.getElementById('nombre').value.trim(),
            rut: document.getElementById('rut').value.trim(),
            servicio: document.getElementById('servicio').value.trim(),
            fecha: document.getElementById('fecha').value,
            hora: document.getElementById('hora').value,
            telefono: document.getElementById('telefono').value.trim(),
            estado: 'confirmada',
            fechaCreacion: new Date().toISOString()
        };

        this.guardarCita(cita);
        this.closeModal();
        this.showConfirmation(cita);
    }

    guardarCita(cita) {
        this.citas.push(cita);
        localStorage.setItem('citas', JSON.stringify(this.citas));
    }

    showConfirmation(cita) {
        const modal = document.getElementById('modalConfirmacion');
        const detalles = document.getElementById('confirmacionDetalles');
        
        detalles.innerHTML = `
            <h3>Detalles de tu cita</h3>
            <p><strong>Servicio:</strong> ${cita.servicio}</p>
            <p><strong>Fecha:</strong> ${new Date(cita.fecha).toLocaleDateString('es-CL')}</p>
            <p><strong>Hora:</strong> ${cita.hora}</p>
            <p><strong>Nombre:</strong> ${cita.nombre}</p>
            <p><strong>RUT:</strong> ${cita.rut}</p>
            ${cita.telefono ? `<p><strong>Teléfono:</strong> ${cita.telefono}</p>` : ''}
        `;
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeConfirmationModal() {
        const modal = document.getElementById('modalConfirmacion');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        this.cargarCitas();
    }

    showError(message) {
        // Crear elemento de error si no existe
        let errorDiv = document.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #dc3545;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 10000;
                font-family: 'Poppins', sans-serif;
                box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
            `;
            document.body.appendChild(errorDiv);
        }
        
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    setupNavigation() {
        // Manejar navegación suave
        document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href').substring(1);
                const target = document.getElementById(targetId);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    cargarCitas() {
        const container = document.getElementById('citasContainer');
        if (!container) return;

        // Obtener citas del localStorage
        this.citas = JSON.parse(localStorage.getItem('citas')) || [];
        
        // Filtrar solo citas confirmadas (no canceladas)
        const citasConfirmadas = this.citas.filter(cita => cita.estado !== 'cancelada');

        if (citasConfirmadas.length === 0) {
            container.innerHTML = `
                <div class="no-citas-calendario">
                    <div class="calendario-vacio">
                        <h3>No tienes citas agendadas</h3>
                        <p>Agenda tu primera cita para verla en el calendario</p>
                        <a href="#servicios" class="btn">Agendar una cita</a>
                    </div>
                </div>
            `;
            return;
        }

        // Generar calendario con navegación de semanas
        const calendarioHTML = this.generarCalendarioConNavegacion(citasConfirmadas);
        container.innerHTML = calendarioHTML;
        
        // Configurar eventos de navegación
        this.setupNavegacionSemanal(citasConfirmadas);
    }

    generarCalendarioConNavegacion(citas) {
        const today = new Date();
        const currentWeekOffset = this.currentWeekOffset || 0;
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + (currentWeekOffset * 7)); // Domingo
        
        // Generar HTML del calendario semanal
        let calendarioHTML = `
            <div class="calendario-semanal-container">
                <div class="calendario-semanal-header">
                    <h3>Calendario Semanal</h3>
                    <div class="navegacion-semanal">
                        <button class="btn-semana btn-semana-anterior" id="btnSemanaAnterior">
                            Semana Anterior
                        </button>
                        <button class="btn-semana btn-semana-siguiente" id="btnSemanaSiguiente">
                            Semana Siguiente
                        </button>
                    </div>
                </div>
                <div class="calendario-semanal-grid">
        `;

        // Horas del día (de 10:00 a 18:00)
        const horas = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
        
        // Días de la semana
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        
        // Header con días
        calendarioHTML += '<div class="dias-header"><div class="hora-header">Hora</div>';
        for (let i = 0; i < 7; i++) {
            const diaFecha = new Date(startOfWeek.getTime() + i * 24 * 60 * 60 * 1000);
            const esHoy = diaFecha.toDateString() === today.toDateString();
            calendarioHTML += `
                <div class="dia-header ${esHoy ? 'hoy' : ''}">
                    <div class="dia-nombre">${diasSemana[i]}</div>
                    <div class="dia-fecha">${diaFecha.getDate()}</div>
                </div>
            `;
        }
        calendarioHTML += '</div>';

        // Body con horas y citas
        horas.forEach(hora => {
            calendarioHTML += '<div class="fila-hora">';
            calendarioHTML += `<div class="hora-celda">${hora}</div>`;
            
            for (let i = 0; i < 7; i++) {
                const diaFecha = new Date(startOfWeek.getTime() + i * 24 * 60 * 60 * 1000);
                const fechaStr = diaFecha.toISOString().split('T')[0];
                const esHoy = diaFecha.toDateString() === today.toDateString();
                
                // Buscar citas para esta hora y día
                const citasHoraDia = citas.filter(cita => 
                    cita.fecha === fechaStr && cita.hora === hora
                );
                
                if (citasHoraDia.length > 0) {
                    calendarioHTML += `
                        <div class="celda-cita ${esHoy ? 'hoy' : ''}">
                            ${citasHoraDia.map(cita => `
                                <div class="cita-bloque">
                                    <div class="cita-servicio">${cita.servicio}</div>
                                    <div class="cita-nombre">${cita.nombre}</div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                } else {
                    calendarioHTML += `<div class="celda-vacia ${esHoy ? 'hoy' : ''}"></div>`;
                }
            }
            
            calendarioHTML += '</div>';
        });
        
        calendarioHTML += `
                </div>
            </div>
        `;
        
        return calendarioHTML;
    }

    setupNavegacionSemanal(citas) {
        const btnAnterior = document.getElementById('btnSemanaAnterior');
        const btnSiguiente = document.getElementById('btnSemanaSiguiente');
        
        if (btnAnterior) {
            btnAnterior.addEventListener('click', () => {
                this.currentWeekOffset = (this.currentWeekOffset || 0) - 1;
                this.actualizarCalendario(citas);
            });
        }
        
        if (btnSiguiente) {
            btnSiguiente.addEventListener('click', () => {
                this.currentWeekOffset = (this.currentWeekOffset || 0) + 1;
                this.actualizarCalendario(citas);
            });
        }
        
        // Actualizar estado de los botones
        this.actualizarEstadoBotones();
    }

    actualizarEstadoBotones() {
        const btnAnterior = document.getElementById('btnSemanaAnterior');
        const btnSiguiente = document.getElementById('btnSemanaSiguiente');
        
        if (btnAnterior) {
            // Deshabilitar botón anterior si estamos en la semana actual o antes
            if (this.currentWeekOffset <= 0) {
                btnAnterior.disabled = true;
                btnAnterior.classList.add('disabled');
            } else {
                btnAnterior.disabled = false;
                btnAnterior.classList.remove('disabled');
            }
        }
        
        if (btnSiguiente) {
            // El botón siguiente siempre está habilitado
            btnSiguiente.disabled = false;
            btnSiguiente.classList.remove('disabled');
        }
    }

    actualizarCalendario(citas) {
        const container = document.getElementById('citasContainer');
        const calendarioHTML = this.generarCalendarioConNavegacion(citas);
        container.innerHTML = calendarioHTML;
        this.setupNavegacionSemanal(citas);
    }
}

// Función de navegación por pestañas para servicios
function setupServiceNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    // Navegación con clic
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remover clase active de todos los botones y paneles
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Agregar clase active al botón clickeado y su panel correspondiente
            this.classList.add('active');
            const targetPane = document.getElementById(targetTab);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });
    
    // Navegación con teclado (accesibilidad)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            const activeButton = document.querySelector('.tab-btn.active');
            if (!activeButton) return;
            
            const buttons = Array.from(tabButtons);
            const currentIndex = buttons.indexOf(activeButton);
            let nextIndex;
            
            if (e.key === 'ArrowLeft') {
                nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
            } else {
                nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
            }
            
            buttons[nextIndex].click();
            buttons[nextIndex].focus();
        }
    });
}

// Ejecutar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    updateCurrentYear();
    
    // Inicializar sistema de agenda
    const agenda = new AgendaVirtual();
    
    // Configurar navegación de servicios
    setupServiceNavigation();
});