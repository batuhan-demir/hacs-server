document.addEventListener('DOMContentLoaded', () => {
    // Seleccionar el formulario de login
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Evita el envío automático del formulario

            // Capturar los valores de email y password del formulario
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            console.log('Email:', email);
            console.log('Password:', password);

            try {
                // Realizar la solicitud de login al servidor
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                console.log('Response status:', response.status);
                console.log('Response data:', data);

                if (response.ok) {
                    alert('Login successful!');

                    // Almacenar el token en localStorage
                    localStorage.setItem('authToken', data.token);

                    // Redirigir según el rol del usuario
                    const userRole = data.data.role;
                    switch (userRole.toLowerCase()) {
                        case 'donor':
                            window.location.href = 'actors/donor.html';
                            break;
                        case 'aidOrg':
                            window.location.href = 'actors/aidOrg.html';
                            break;
                        case 'volunteer':
                            window.location.href = 'actors/volunteer.html';
                            break;
                        case 'government':
                            window.location.href = 'actors/government.html';
                            break;
                        case 'affected':
                            window.location.href = 'actors/affected.html';
                            break;
                        default:
                            alert('Unknown role. Please contact support.');
                    }
                } else {
                    alert(`Login failed: ${data.message}`);
                }
            } catch (error) {
                console.error('Error during login:', error);
                alert('Server error. Please try again later.');
            }
        });
    } else {
        console.error('loginForm not found');
    }

    // Lógica para el registro
    const registerForm = document.getElementById('registerForm');

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Evita el envío automático del formulario

            // Capturar los valores del formulario de registro
            const userData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                role: document.getElementById('role').value
            };

            console.log('Registering user:', userData);

            try {
                // Realizar la solicitud de registro al servidor
                const response = await fetch('/auth/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });

                const data = await response.json();

                console.log('Response status:', response.status);
                console.log('Response data:', data);

                if (response.ok) {
                    alert('Registration successful! You can now log in.');
                    window.location.href = 'login.html';
                } else {
                    alert(`Registration failed: ${data.message}`);
                }
            } catch (error) {
                console.error('Error during registration:', error);
                alert('Server error. Please try again later.');
            }
        });
    } else {
        console.error('registerForm not found');
    }

    // Función para crear un voluntario a partir de un usuario
    async function createVolunteerFromUser(lastName, firstName, validated, street, postalCode, city, country, userId) {
        const token = localStorage.getItem('authToken');  // Obtener el token desde localStorage

        const command = {
            command: "createVolunteerFromUser",
            args: [lastName, firstName, validated, street, postalCode, city, country, userId]
        };

        try {
            const response = await fetch('/java/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`  // Incluir el token en el encabezado de autorización
                },
                body: JSON.stringify(command)
            });

            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                alert('Volunteer created successfully!');
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error during command execution:', error);
            alert('Error executing command. Please try again.');
        }
    }

    // Función para actualizar un voluntario
    async function updateVolunteer(lastName, firstName, validated, street, postalCode, city, country, userId) {
        const token = localStorage.getItem('authToken');  // Obtener el token desde localStorage

        const command = {
            command: "updateVolunteer",
            args: [lastName, firstName, validated, street, postalCode, city, country, userId]
        };

        try {
            const response = await fetch('/java/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`  // Incluir el token en el encabezado de autorización
                },
                body: JSON.stringify(command)
            });

            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                alert('Volunteer updated successfully!');
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error during command execution:', error);
            alert('Error executing command. Please try again.');
        }
    }

    // Función para obtener todos los voluntarios como un arreglo JSON
    async function getVolunteers() {
        const token = localStorage.getItem('authToken');  // Obtener el token desde localStorage

        const command = {
            command: "getVolunteersAsJsonArray",
            args: []
        };

        try {
            const response = await fetch('/java/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`  // Incluir el token en el encabezado de autorización
                },
                body: JSON.stringify(command)
            });

            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                // Mostrar los voluntarios en el frontend
                console.log('Volunteers:', data);
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error during command execution:', error);
            alert('Error executing command. Please try again.');
        }
    }
});
