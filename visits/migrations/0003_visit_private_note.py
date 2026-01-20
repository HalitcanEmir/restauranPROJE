from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("visits", "0002_visit_atmosphere_visit_sentiment_visit_suitable_for_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="visit",
            name="private_note",
            field=models.TextField(
                blank=True,
                help_text="Bu mekana dair sadece senin görebileceğin kişisel notlar",
            ),
        ),
    ]

