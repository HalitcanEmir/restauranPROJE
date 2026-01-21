from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("social", "0002_groupplan_planvote_planplaceoption_planparticipant_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="groupplan",
            name="poll_questions",
            field=models.JSONField(
                default=list,
                blank=True,
                help_text="Grup içi oylama soruları listesi (örn: ['Bugün akşam geliyor musun?', 'Kaça kadar kalabilirsin?'])",
            ),
        ),
        migrations.AddField(
            model_name="planparticipant",
            name="poll_answers",
            field=models.JSONField(
                default=dict,
                blank=True,
                help_text="Grup planı içindeki sorulara verilen cevaplar, {'0': 'Evet', '1': '23:00'} gibi",
            ),
        ),
    ]

