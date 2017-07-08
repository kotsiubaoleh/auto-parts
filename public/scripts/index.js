$(function () {
    $('.search-form').submit(function (event) {
        event.preventDefault();
        var content = $('tbody');
        content.html('');
        $.ajax('search/' +  $('.search-form input').val())
            .done(function (res) {
                switch(res.status) {
                    case 'ok':
                        res.data.forEach(function (result) {
                            var row = $('<tr></tr>');
                            row.append($('<td>'+result.id+'</td>'));
                            row.append($('<td>'+result.description+'</td>'));
                            row.append($('<td>'+result.brand+'</td>'));
                            row.append($('<td>'+result.price+'</td>'));
                            content.append(row);
                            console.log(content);
                        });
                    break;
                    case 'narrow': {
                        $('#narrow-modal').modal('show');
                        var list = $('#narrow-options');
                        list.html('');
                        res.data.forEach(function (option) {
                            var item = $('<div>', {'class': 'form-check'});
                            var label = $('<label>', {'class': 'form-check-label'});
                            label.text(option.text);
                            label.prepend($('<input>',{value: option.value, type: 'checkbox', 'class': 'form-check-input'}));
                            item.append(label);
                            list.append(item);
                        })
                    }
                }

            });
    });
});