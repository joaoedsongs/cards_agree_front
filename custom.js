const url_back = 'http://127.0.0.1:8000/api/v1';
let accessToken = localStorage.getItem("accessToken");
let cardId;

const getData = async () =>{
    try {        

        if (!accessToken) {
            console.log("No hay accessToken. El usuario podría necesitar iniciar sesión.");
            return;
        }
        
        const headers = {
            Authorization: `Bearer ${accessToken}`,
        };

        let { data } = await axios.get(`${url_back}/cards`, { headers });
        
        makeDataTables(data);
        
    }catch (err) {
        console.error("Error en la solicitud:", err);

        if (err.response && err.response.status === 401) {
            console.log("No autorizado. Deberías redirigir al usuario a la página de inicio de sesión.");
        }
    }
}


const login = async () => {
    try {
        const existingToken = localStorage.getItem("accessToken");
        if (existingToken) {
            console.log("Ya hay un token disponible. No se ejecutará la autenticación nuevamente.");
            return;
        }

        const postData = {
            "email": "front@example.com",
            "password": "password"
        };
        
        let { data } = await axios.post(`${url_back}/login`, postData);
            
        localStorage.setItem("accessToken", data.token);
        accessToken = data.token;

    } catch (error) {
        console.error("Error en la solicitud:", error);                
    }
};

const makeDataTables = (data) => {
    $('#cardsTable').DataTable({
        data,
        columns: [
            { data: 'id', title: 'ID' },
            { data: 'name', title: 'Nombre' },
            { data: 'hp', title: 'HP' },
            { 
                data: 'first_edition', title: 'Primera Edición', className: 'first_edition',
                render: function(data, type, row, meta) {
                    return data ? `<i class="bi bi-check-circle-fill text-success ms-4"></i>` : `<i class="bi bi-x-circle-fill text-danger ms-4"></i>`;
                }
                },
            { data: 'price', title: 'Precio' },
            { data: 'expansion.name', title: 'Expansion' },                    
            { data: 'rarity.name', title: 'Rarity' },
            {
                data: null, title: 'Types',
                render: function (data, type, row, meta) {
                    return row.types.map(type => type.name).join(', ');
                },
            },
            { data: 'created_at', title: 'Creación' },
            { data: 'updated_at', title: 'Ultima Actulización' },
            {
                data: null,
                title: 'Acciones',
                className: 'text-center',
                orderable: false,
                render: function (data, type, row) {
                    return `
                            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#showModal" data-card-id="${row.id}"><i class="bi bi-eye-fill"></i></button>
                            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#editCardModal" data-card-id="${row.id}"><i class="bi bi-pencil-fill"></i></button>
                            <button class="btn btn-danger" onclick="deleteRegister(${row.id})"><i class="bi bi-trash-fill"></i></button>`;
                },
            },
        ],
        order: [[9, 'desc']],
    });
}

function setupModalEvents() {
    const headers = {
        Authorization: `Bearer ${accessToken}`,
    };

    $('#editCardModal').on('show.bs.modal', async function (event) {
        const button = $(event.relatedTarget);
        cardId = button.data('card-id');
        let card = null;
        try {
            if(cardId){
                card = axios.get(`${url_back}/cards/${cardId}`, { headers });
            }
            const expansions = axios.get(`${url_back}/expansions`, { headers });
            const rarities = axios.get(`${url_back}/rarities`, { headers });
            const types = axios.get(`${url_back}/types`, { headers });
            if(cardId){
                axios
                    .all([card, expansions, rarities, types])
                    .then(axios.spread((cardResponse, expansionsResponse, raritiesResponse, typesReponse) => {                    
                        setModalData(cardResponse.data, expansionsResponse.data, raritiesResponse.data, typesReponse.data);
                    }))
                    .catch(error => {
                        console.error(error);
                    });
            }else{
                axios
                    .all([expansions, rarities, types])
                    .then(axios.spread(( expansionsResponse, raritiesResponse, typesReponse) => {                    
                        setModalData(null, expansionsResponse.data, raritiesResponse.data, typesReponse.data);
                    }))
                    .catch(error => {
                        console.error(error);
                    });
            }
    
        } catch (error) {
            console.error('Error al cargar los datos de la carta:', error);
        }
        
    });

    // Evento para abrir el modal de eliminación
    $('#showModal').on('show.bs.modal', async function (event) {
        const button = $(event.relatedTarget);
        const cardId = button.data('card-id');
    console.log(cardId)
        const { data } = await axios.get(`${url_back}/cards/${cardId}`, { headers });
        console.log(data)
        $("#show_name").text(data.name);
        $("#show_hp").text(data.hp);
        $("#show_expansion").text(data.expansion.name);
        $("#show_rarity").text(data.rarity.name);
        $("#show_types").text(data.types.map(type => type.name).join(', '));
        const first_ediition = data.first_edition ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-x-circle-fill text-danger"></i>' ;
        $("#show_first_edition").html(first_ediition);
        $("#show_img").attr('src', data.img);
        $("#show_img").attr('alt', data.name);
    });
}

async function getModalData($arrayRequests) {
    try {
        const results = await Promise.all($arrayRequests);
        // Aquí puedes manejar los datos
        const data = results.map(response => response.data);
        console.log(data);
    } catch (error) {
        // Aquí puedes manejar los errores
        console.error(error);
    }
}

const setModalData = (card = null, expansion, rarities, types) => {
    fillSelectWithOptions($('#expansion_id'), expansion);
    fillSelectWithOptions($('#rarity_id'), rarities);
    fillSelectWithOptions($('#type_ids'), types);

    if(!card){
        $("#img").prop('required', true);
        $("#_method").val('post');
        return;
    } 
    $("#_method").val('put');
    $("#img").prop('required', false);


    const selectedTypeIds = card.types.map(type => type.id);

    $('#name').val(card.name);
    $('#hp').val(card.hp);
    $('#price').val(card.price);
    $('#expansion_id').val(card.expansion_id);
    $('#rarity_id').val(card.rarity_id);
    $('#type_ids').val(selectedTypeIds);
    $('#type_ids').trigger('change');
    $('#first_edition').prop('checked', card.first_edition);

}

const fillSelectWithOptions = (selectElement, optionsObject) => {
    selectElement.empty();
    // Agregar el option vacío al principio
    const emptyOption = $('<option></option>').attr('value', '').attr('disabled', true).attr('selected', true).text('Seleccione una opción');
    selectElement.append(emptyOption);
    // Iterar sobre las claves y valores del objeto
    for (const [key, value] of Object.entries(optionsObject)) {
        const option = $('<option></option>').attr('value', key).text(value);
        selectElement.append(option);
    }
};

const formEdit = () => {
    document.getElementById('form_edit').addEventListener('submit', function (event) {
        event.preventDefault(); 

        const typeIdsArray = $('#type_ids').val();
        const hpValue = parseInt($('#hp').val(), 10);

        // Validar que hp sea un múltiplo de 10
        if (hpValue % 10 !== 0) {
            alert('La salud (HP) debe ser un múltiplo de 10.');
            return;
        }
        
        const formData = new FormData(this);

        typeIdsArray.forEach((typeId, index) => {
            formData.append(`type_ids[${index}]`, typeId);
        });
        const url = (cardId) ? `${url_back}/cards/${cardId}` : `${url_back}/cards`;

        axios.post(`${url}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${accessToken}`
            }
        })
        .then(response => {
            console.log(response.data);
            window.location.reload(true);

                
            // Cierra el modal si es necesario
            $('#editCardModal').modal('hide');
        })
        .catch(error => {
            console.error(error);
        });
    });
}

const deleteRegister = (id) => {
    axios.delete(`${url_back}/cards/${id}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
    .then(response => {
        window.location.reload(true);
    })
    .catch(error => {
        console.error(error);
    });
}