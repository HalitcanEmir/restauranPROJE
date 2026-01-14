from django import forms
import json
from .models import Visit


class VisitForm(forms.ModelForm):
    """Ziyaret/Değerlendirme formu (Eski form - backward compatibility)"""
    def clean_mood_tags(self):
        """Mood tags JSON validasyonu"""
        mood_tags = self.cleaned_data.get('mood_tags')
        if isinstance(mood_tags, str):
            try:
                mood_tags = json.loads(mood_tags)
            except json.JSONDecodeError:
                raise forms.ValidationError('Geçerli bir JSON formatı girin (örn: ["samimi", "sessiz"])')
        if not isinstance(mood_tags, list):
            raise forms.ValidationError('Mood tags bir liste olmalıdır')
        return mood_tags
    
    class Meta:
        model = Visit
        fields = ['with_whom', 'rating', 'comment', 'mood_tags']  # visited_at kaldırıldı (auto_now_add)
        widgets = {
            'with_whom': forms.Select(attrs={'class': 'form-control'}),
            'rating': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 1,
                'max': 5,
                'step': 1
            }),
            'comment': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 5,
                'placeholder': 'Mekan hakkında yorumunuzu yazın...'
            }),
            'mood_tags': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Örn: ["samimi", "sessiz", "butik"] (JSON format)'
            }),
        }
        labels = {
            'with_whom': 'Kiminle Gittiniz?',
            'rating': 'Puan (1-5)',
            'comment': 'Yorum',
            'mood_tags': 'Ortam Etiketleri',
        }
