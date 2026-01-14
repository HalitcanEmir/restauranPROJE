from django import forms
import json
from django.contrib.auth import get_user_model
from .models import Profile

User = get_user_model()


class RegisterForm(forms.ModelForm):
    """Kayıt formu"""
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'En az 8 karakter'
        }),
        label='Şifre',
        min_length=8
    )
    password_confirm = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Şifrenizi tekrar girin'
        }),
        label='Şifre Tekrar'
    )
    
    class Meta:
        model = User
        fields = ['username', 'email']
        widgets = {
            'username': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Kullanıcı adınızı girin'
            }),
            'email': forms.EmailInput(attrs={
                'class': 'form-control',
                'placeholder': 'ornek@email.com'
            }),
        }
        labels = {
            'username': 'Kullanıcı Adı',
            'email': 'E-posta',
        }
    
    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        password_confirm = cleaned_data.get('password_confirm')
        
        if password and password_confirm and password != password_confirm:
            raise forms.ValidationError('Şifreler eşleşmiyor!')
        
        return cleaned_data
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password'])
        if commit:
            user.save()
        return user


class ProfileEditForm(forms.ModelForm):
    """Profil düzenleme formu"""
    def clean_favorite_categories(self):
        """Favorite categories JSON validasyonu"""
        favorite_categories = self.cleaned_data.get('favorite_categories')
        if isinstance(favorite_categories, str):
            try:
                favorite_categories = json.loads(favorite_categories)
            except json.JSONDecodeError:
                raise forms.ValidationError('Geçerli bir JSON formatı girin (örn: ["kafe", "restoran"])')
        if not isinstance(favorite_categories, list):
            raise forms.ValidationError('Favorite categories bir liste olmalıdır')
        return favorite_categories
    
    class Meta:
        model = Profile
        fields = ['display_name', 'city', 'bio', 'avatar', 'favorite_categories']
        widgets = {
            'display_name': forms.TextInput(attrs={'class': 'form-control'}),
            'city': forms.TextInput(attrs={'class': 'form-control'}),
            'bio': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'avatar': forms.FileInput(attrs={'class': 'form-control'}),
            'favorite_categories': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Örn: ["kafe", "restoran", "bar"]'
            }),
        }
        labels = {
            'display_name': 'Görünen Ad',
            'city': 'Şehir',
            'bio': 'Biyografi',
            'avatar': 'Profil Fotoğrafı',
            'favorite_categories': 'Favori Kategoriler (JSON)',
        }
