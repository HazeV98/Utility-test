export function avviaMotoreGuida() {
    
    // Espongo la funzione di gestione dell'accordion a livello globale
    window.toggleGuideAccordion = (button) => {
        const accordionItem = button.closest('.guide-accordion-item');
        const isActive = accordionItem.classList.contains('active');
        
        // Chiudi tutti gli accordion aperti nella guida
        document.querySelectorAll('.guide-accordion-item.active').forEach(item => {
            if (item !== accordionItem) {
                item.classList.remove('active');
            }
        });
        
        // Toggle dell'accordion corrente
        if (isActive) {
            accordionItem.classList.remove('active');
        } else {
            accordionItem.classList.add('active');
        }
    };
    
}
