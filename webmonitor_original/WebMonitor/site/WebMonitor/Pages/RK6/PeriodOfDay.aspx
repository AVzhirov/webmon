<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="PeriodOfDay.aspx.cs" Inherits="WebMonitor.Pages.RK6.PeriodOfDay" EnableViewState="false"%>

<!DOCTYPE>
<html>
<head id="Head1" runat="server">
    <link rel="stylesheet" type="text/css" href="../../CSS/styles.css"/>
    <title></title>
</head>
<body>
    
    <form id="PeriodOfDayForm" runat="server">
    <div align="center">
        <asp:Label ID="TitleLabel" runat="server" Text="Период дня" Font-Bold="True" 
            Font-Size="Medium"></asp:Label>
    </div>
    <div>                
        <asp:PlaceHolder ID="PlaceHolder" runat="server"></asp:PlaceHolder>
    </div>
    </form>
</body>
</html>