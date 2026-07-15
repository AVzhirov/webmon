<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="SumOrdersTotal.aspx.cs" Inherits="WebMonitor.Pages.RK6.SumOrdersTotal" EnableViewState="false"%>

<!DOCTYPE>
<html>
<head id="Head1" runat="server">
    <link rel="stylesheet" type="text/css" href="../../CSS/styles.css"/>
    <title></title>
</head>
<body>
    
    <form id="OpenSumForm" runat="server">
    <div align="center">
        <asp:Label ID="TitleLabel" runat="server" Text="Суммы заказов" Font-Bold="True" 
            Font-Size="Medium"></asp:Label>
    </div>
    <div>                
        <asp:PlaceHolder ID="PlaceHolder" runat="server"></asp:PlaceHolder>
    </div>
    </form>
</body>
</html>