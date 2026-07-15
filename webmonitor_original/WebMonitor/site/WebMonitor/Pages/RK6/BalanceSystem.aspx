<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="BalanceSystem.aspx.cs" Inherits="WebMonitor.Pages.RK6.BalanceSystem" EnableViewState="false"%>

<!DOCTYPE>

<html>
<head runat="server">
    <link rel="stylesheet" type="text/css" href="../../CSS/styles.css"/>
    <title></title>
</head>
<body>
    <form id="BalanceSystemForm" runat="server">
    <div align="center">
		<asp:Label ID="TitleLabel" runat="server" Text="Системный балансовый отчет" Font-Bold="True" 
            Font-Size="Medium"></asp:Label>
    </div>
	<div>                
        <asp:PlaceHolder ID="PlaceHolder" runat="server"></asp:PlaceHolder>
    </div>
    </form>
</body>
</html>
