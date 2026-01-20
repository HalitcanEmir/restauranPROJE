/**
 * Harita Entegrasyonu - Google Maps API
 * Swipe kartlarından harita modal'ını açar, yakındaki mekanları gösterir ve rota çizer
 */

let map = null;
let currentPlace = null;
let currentMarker = null;
let nearbyMarkers = [];
let directionsService = null;
let directionsRenderer = null;
let userLocation = null;

/**
 * Harita modal'ını açar
 */
window.showMapModal = function(place) {
    currentPlace = place;
    
    // Modal'ı göster
    const modal = document.getElementById('mapModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Place bilgilerini göster
        const titleEl = document.getElementById('mapModalTitle');
        const infoEl = document.getElementById('mapPlaceInfo');
        
        if (titleEl) {
            titleEl.textContent = place.name;
        }
        
        if (infoEl) {
            infoEl.innerHTML = `
                <div class="map-place-name">${place.name}</div>
                <div class="map-place-address">
                    <i class="bi bi-geo-alt"></i>
                    ${place.address || ''}${place.city ? ', ' + place.city : ''}
                </div>
            `;
        }
        
        // Haritayı başlat
        initMap();
    }
};

/**
 * Harita modal'ını kapatır
 */
window.closeMapModal = function() {
    const modal = document.getElementById('mapModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        
        // Haritayı temizle
        if (directionsRenderer) {
            directionsRenderer.setMap(null);
        }
        nearbyMarkers.forEach(marker => marker.setMap(null));
        nearbyMarkers = [];
    }
};

/**
 * Haritayı başlatır
 */
function initMap() {
    if (!currentPlace || !currentPlace.latitude || !currentPlace.longitude) {
        alert('Bu mekanın konum bilgisi bulunmuyor.');
        return;
    }
    
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) return;
    
    // Eğer harita zaten oluşturulmuşsa, sadece merkezi güncelle
    if (map) {
        const center = { lat: currentPlace.latitude, lng: currentPlace.longitude };
        map.setCenter(center);
        
        // Marker'ı güncelle
        if (currentMarker) {
            currentMarker.setPosition(center);
        } else {
            currentMarker = new google.maps.Marker({
                position: center,
                map: map,
                title: currentPlace.name,
                icon: {
                    url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                }
            });
        }
        return;
    }
    
    // Yeni harita oluştur
    const center = { lat: currentPlace.latitude, lng: currentPlace.longitude };
    
    map = new google.maps.Map(mapContainer, {
        center: center,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true
    });
    
    // Ana mekan marker'ı
    currentMarker = new google.maps.Marker({
        position: center,
        map: map,
        title: currentPlace.name,
        animation: google.maps.Animation.DROP,
        icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
        }
    });
    
    // Info window
    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div style="padding: 8px;">
                <strong>${currentPlace.name}</strong><br>
                ${currentPlace.address || ''}${currentPlace.city ? ', ' + currentPlace.city : ''}
            </div>
        `
    });
    
    currentMarker.addListener('click', () => {
        infoWindow.open(map, currentMarker);
    });
    
    // Directions service ve renderer
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: false
    });
    
    // Kullanıcı konumunu al
    getUserLocation();
}

/**
 * Kullanıcının konumunu alır
 */
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Kullanıcı konumu marker'ı ekle
                new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: 'Senin Konumun',
                    icon: {
                        url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                    },
                    animation: google.maps.Animation.DROP
                });
            },
            (error) => {
                console.log('Konum alınamadı:', error);
            }
        );
    }
}

/**
 * Rota çizer (kullanıcı konumundan mekana)
 */
window.getRoute = function() {
    if (!map || !currentPlace) return;
    
    if (!userLocation) {
        alert('Rota çizmek için konum izni vermeniz gerekiyor.');
        getUserLocation();
        return;
    }
    
    const request = {
        origin: userLocation,
        destination: { lat: currentPlace.latitude, lng: currentPlace.longitude },
        travelMode: google.maps.TravelMode.DRIVING
    };
    
    directionsService.route(request, (result, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
            
            // Rota bilgilerini göster
            const route = result.routes[0];
            const leg = route.legs[0];
            
            alert(`Rota: ${leg.distance.text}, Süre: ${leg.duration.text}`);
        } else {
            alert('Rota çizilemedi: ' + status);
        }
    });
};

/**
 * Yakındaki mekanları gösterir
 */
window.showNearbyPlaces = async function() {
    if (!map || !currentPlace) return;
    
    const btn = document.getElementById('btnShowNearby');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Yükleniyor...';
    }
    
    try {
        // API'den yakındaki mekanları al
        const response = await fetch(`/api/places/nearby/?lat=${currentPlace.latitude}&lon=${currentPlace.longitude}&radius=3&limit=10`, {
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error('Yakındaki mekanlar alınamadı');
        }
        
        const data = await response.json();
        
        // Önceki marker'ları temizle
        nearbyMarkers.forEach(marker => marker.setMap(null));
        nearbyMarkers = [];
        
        if (data.places && data.places.length > 0) {
            // Yakındaki mekanları haritada göster
            data.places.forEach(place => {
                if (place.id === currentPlace.id) return; // Ana mekanı tekrar ekleme
                
                const marker = new google.maps.Marker({
                    position: { lat: parseFloat(place.latitude), lng: parseFloat(place.longitude) },
                    map: map,
                    title: place.name,
                    icon: {
                        url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                    }
                });
                
                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="padding: 8px;">
                            <strong>${place.name}</strong><br>
                            ${place.address || ''}${place.city ? ', ' + place.city : ''}<br>
                            <small>Mesafe: ${place.distance_km} km</small>
                        </div>
                    `
                });
                
                marker.addListener('click', () => {
                    infoWindow.open(map, marker);
                });
                
                nearbyMarkers.push(marker);
            });
            
            // Haritayı tüm marker'ları gösterecek şekilde ayarla
            const bounds = new google.maps.LatLngBounds();
            nearbyMarkers.forEach(marker => bounds.extend(marker.getPosition()));
            if (currentMarker) bounds.extend(currentMarker.getPosition());
            if (userLocation) bounds.extend(userLocation);
            map.fitBounds(bounds);
            
            alert(`${data.count} yakın mekan bulundu!`);
        } else {
            alert('Yakında mekan bulunamadı.');
        }
    } catch (error) {
        console.error('Yakındaki mekanlar yüklenirken hata:', error);
        alert('Yakındaki mekanlar yüklenirken bir hata oluştu.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-geo-alt"></i> Yakındakileri Göster';
        }
    }
};

// Modal dışına tıklanınca kapat
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('mapModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeMapModal();
            }
        });
    }
    
    // ESC tuşu ile kapat
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeMapModal();
        }
    });
});
