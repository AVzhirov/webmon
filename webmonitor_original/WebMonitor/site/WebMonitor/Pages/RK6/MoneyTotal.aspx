<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="MoneyTotal.aspx.cs" Inherits="WebMonitor.Pages.RK6.MoneyTotal" EnableViewState="false"%>

<html>
<head id="Head1" runat="server">
	<link rel="stylesheet" type="text/css" href="../../CSS/styles.css"/>
    <title></title>
</head>
<body>
    
    <form id="MoneyForm" runat="server">
    <div align="center">
        <asp:Label ID="TitleLabel" runat="server" Text="Выручка" Font-Bold="True" 
            Font-Size="Medium"></asp:Label>
    </div>
    <div>                
        <asp:PlaceHolder ID="PlaceHolder" runat="server"></asp:PlaceHolder>
    </div>
    </form>
</body>
</html>